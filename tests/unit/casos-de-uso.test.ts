import { describe, expect, it } from "vitest"
import { CadastrarAnuncianteUseCase } from "@/application/use-cases/acesso/conta"
import { RemoverCategoriaUseCase } from "@/application/use-cases/admin/administracao"
import {
  AtivarOuDesativarAnuncioUseCase,
  CriarAnuncioUseCase,
  EditarAnuncioUseCase,
  RemoverAnuncioUseCase,
  RestaurarAnuncioUseCase,
} from "@/application/use-cases/anuncios/gerenciar-anuncios"
import { AvisarMensagemNovaUseCase, EnviarMensagemUseCase } from "@/application/use-cases/anuncios/mensagens"
import { ConfirmarPagamentoUseCase, MontarCobrancaPixUseCase, SolicitarRenovacaoUseCase } from "@/application/use-cases/pagamentos/pagamentos"
import type { ConteudoDoAnuncio } from "@/domain/anuncio/anuncio"
import { ESTILO_PADRAO } from "@/domain/anuncio/anuncio"
import { SessoesEmMemoria, UsuariosEmMemoria, caderno, enderecosDeTeste, hashFalso, localidades, tokensFalsos } from "../fakes"

const DIA = 86_400_000
const BRASILIA = 5300108
const GOIANIA = 5208707

const conteudo: ConteudoDoAnuncio = {
  categoriaId: "cat-veiculos",
  uf: "DF",
  cidadeCodigo: BRASILIA,
  titulo: "Vendo Gol 2010",
  texto: "Completo, revisado, IPVA pago.",
  precoCentavos: 2_200_000,
  estilo: ESTILO_PADRAO,
}

const USUARIO = { id: "usuario-1", email: "dono@exemplo.com" }
const novo = { ...conteudo, planoCodigo: "SIMPLES", dias: 7 }
const RENOVA = { email: "dono@exemplo.com", planoCodigo: "SIMPLES", dias: 7 }

function montar() {
  const c = caderno()
  return {
    ...c,
    criar: new CriarAnuncioUseCase(c.anuncios, c.categorias, localidades, c.codigos, c.depsDePagamento),
    editar: new EditarAnuncioUseCase(c.anuncios, c.categorias, localidades),
    remover: new RemoverAnuncioUseCase(c.anuncios, c.pagamentos, c.gateway),
    restaurar: new RestaurarAnuncioUseCase(c.anuncios),
    ativarOuDesativar: new AtivarOuDesativarAnuncioUseCase(c.anuncios, c.relogio),
    confirmar: new ConfirmarPagamentoUseCase(c.anuncios, c.pagamentos, c.relogio),
    renovar: new SolicitarRenovacaoUseCase(c.anuncios, c.depsDePagamento),
    mensagem: new EnviarMensagemUseCase(
      c.anuncios,
      c.mensagens,
      c.relogio,
      new AvisarMensagemNovaUseCase(c.usuarios, c.mensagens, c.correio, c.relogio, enderecosDeTeste),
      c.segundoPlano,
    ),
    cobranca: new MontarCobrancaPixUseCase(c.configuracao),
  }
}

describe("Criar anúncio (RF-10, RN-10)", () => {
  it("nasce aguardando pagamento, com código público e uma cobrança de R$ 1,00 por 7 dias", async () => {
    const t = montar()
    const r = await t.criar.executar(USUARIO, novo)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const anuncio = (await t.anuncios.buscarPorId(r.valor.anuncioId))!
    expect(anuncio.situacao).toBe("AGUARDANDO_PAGAMENTO")
    expect(anuncio.codigo).toHaveLength(6)
    const pendente = (await t.pagamentos.pendenteDoAnuncio(anuncio.id))!
    expect(pendente).toMatchObject({ valorCentavos: 100, dias: 7, situacao: "PENDENTE", usuarioId: "usuario-1" })
  })

  it("recusa cidade de outra UF e categoria desativada", async () => {
    const t = montar()
    const r = await t.criar.executar(USUARIO, { ...novo, cidadeCodigo: GOIANIA, categoriaId: "cat-antiga" })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.campos?.cidadeCodigo).toBeDefined()
    expect(r.campos?.categoriaId).toBeDefined()
  })
})

describe("Pagamento e tempo no ar (RN-12, RN-21, RN-22)", () => {
  it("confirmar o Pix publica por 7 dias; renovar no ar soma dias", async () => {
    const t = montar()
    const r = await t.criar.executar(USUARIO, novo)
    if (!r.ok) throw new Error(r.mensagem)
    const primeiro = (await t.pagamentos.pendenteDoAnuncio(r.valor.anuncioId))!

    const conf = await t.confirmar.executar({ pagamentoId: primeiro.id, adminId: "admin" })
    expect(conf.ok).toBe(true)
    let anuncio = (await t.anuncios.buscarPorId(r.valor.anuncioId))!
    expect(anuncio.situacao).toBe("PUBLICADO")
    expect(anuncio.expiraEm!.getTime()).toBe(t.relogio.agora().getTime() + 7 * DIA)

    t.relogio.avancarDias(5)
    const renovacao = await t.renovar.executar({ ...RENOVA, usuarioId: "usuario-1", anuncioId: anuncio.id })
    if (!renovacao.ok) throw new Error(renovacao.mensagem)
    await t.confirmar.executar({ pagamentoId: renovacao.valor.id, adminId: "admin" })
    anuncio = (await t.anuncios.buscarPorId(anuncio.id))!
    // Restavam 2 dias; com mais 7, fica no ar por 9 dias a partir de agora.
    expect(anuncio.expiraEm!.getTime()).toBe(t.relogio.agora().getTime() + 9 * DIA)
  })

  it("não confirma o mesmo pagamento duas vezes", async () => {
    const t = montar()
    const r = await t.criar.executar(USUARIO, novo)
    if (!r.ok) throw new Error(r.mensagem)
    const pendente = (await t.pagamentos.pendenteDoAnuncio(r.valor.anuncioId))!
    await t.confirmar.executar({ pagamentoId: pendente.id, adminId: "admin" })
    const segunda = await t.confirmar.executar({ pagamentoId: pendente.id, adminId: "admin" })
    expect(segunda.ok).toBe(false)
  })

  it("renovar com cobrança aberta devolve a mesma cobrança", async () => {
    const t = montar()
    const r = await t.criar.executar(USUARIO, novo)
    if (!r.ok) throw new Error(r.mensagem)
    const a = await t.renovar.executar({ ...RENOVA, usuarioId: "usuario-1", anuncioId: r.valor.anuncioId })
    const b = await t.renovar.executar({ ...RENOVA, usuarioId: "usuario-1", anuncioId: r.valor.anuncioId })
    expect(a.ok && b.ok && a.valor.id === b.valor.id).toBe(true)
    expect([...t.pagamentos.itens.values()].filter((p) => p.situacao === "PENDENTE")).toHaveLength(1)
  })

  it("outro usuário não renova o anúncio alheio", async () => {
    const t = montar()
    const r = await t.criar.executar(USUARIO, novo)
    if (!r.ok) throw new Error(r.mensagem)
    expect((await t.renovar.executar({ ...RENOVA, usuarioId: "intruso", anuncioId: r.valor.anuncioId })).ok).toBe(false)
  })

  it("monta o Pix só quando o recebedor está configurado", async () => {
    const t = montar()
    const r = await t.criar.executar(USUARIO, novo)
    if (!r.ok) throw new Error(r.mensagem)
    const pendente = (await t.pagamentos.pendenteDoAnuncio(r.valor.anuncioId))!
    expect((await t.cobranca.executar(pendente)).copiaECola).toBeNull()
    t.configuracao.cfg = { ...t.configuracao.cfg, pixChave: "52998224725", pixNome: "Fulano", pixCidade: "Brasilia" }
    const cobranca = await t.cobranca.executar(pendente)
    expect(cobranca.copiaECola).toContain(pendente.codigo)
  })
})

describe("Editar, remover e restaurar (RN-11, RN-14)", () => {
  it("só o dono (ou o admin) edita; removido não edita", async () => {
    const t = montar()
    const r = await t.criar.executar(USUARIO, novo)
    if (!r.ok) throw new Error(r.mensagem)
    const id = r.valor.anuncioId
    expect((await t.editar.executar({ usuarioId: "intruso", perfil: "ANUNCIANTE" }, id, { ...conteudo, titulo: "Outro" })).ok).toBe(false)
    expect((await t.editar.executar({ usuarioId: "usuario-1", perfil: "ANUNCIANTE" }, id, { ...conteudo, titulo: "Gol 2010 baixou" })).ok).toBe(true)
    expect((await t.anuncios.buscarPorId(id))!.titulo).toBe("Gol 2010 baixou")

    await t.remover.executar({ usuarioId: "usuario-1", perfil: "ANUNCIANTE" }, id)
    expect((await t.anuncios.buscarPorId(id))!.situacao).toBe("REMOVIDO")
    expect(await t.pagamentos.pendenteDoAnuncio(id)).toBeNull()
    expect((await t.editar.executar({ usuarioId: "usuario-1", perfil: "ANUNCIANTE" }, id, conteudo)).ok).toBe(false)

    expect((await t.restaurar.executar({ usuarioId: "usuario-1", perfil: "ANUNCIANTE" }, id)).ok).toBe(false)
    expect((await t.restaurar.executar({ usuarioId: "admin", perfil: "ADMIN" }, id)).ok).toBe(true)
    expect((await t.anuncios.buscarPorId(id))!.situacao).toBe("AGUARDANDO_PAGAMENTO")
  })
})

describe("Ativar e desativar (feature 014, RF-140, RN-140 a RN-145)", () => {
  const DONO = { usuarioId: "usuario-1", perfil: "ANUNCIANTE" as const }

  async function noAr(t: ReturnType<typeof montar>) {
    const r = await t.criar.executar(USUARIO, novo)
    if (!r.ok) throw new Error(r.mensagem)
    const pendente = (await t.pagamentos.pendenteDoAnuncio(r.valor.anuncioId))!
    await t.confirmar.executar({ pagamentoId: pendente.id, adminId: "admin" })
    return (await t.anuncios.buscarPorId(r.valor.anuncioId))!
  }

  it("o dono desativa e ativa; o prazo não muda (RN-141)", async () => {
    const t = montar()
    const anuncio = await noAr(t)
    const fim = anuncio.expiraEm!.getTime()

    expect((await t.ativarOuDesativar.desativar(DONO, anuncio.id)).ok).toBe(true)
    let agora = (await t.anuncios.buscarPorId(anuncio.id))!
    expect(agora.situacao).toBe("DESATIVADO")
    expect(agora.expiraEm!.getTime()).toBe(fim)

    t.relogio.avancarDias(2)
    expect((await t.ativarOuDesativar.ativar(DONO, anuncio.id)).ok).toBe(true)
    agora = (await t.anuncios.buscarPorId(anuncio.id))!
    expect(agora.situacao).toBe("PUBLICADO")
    // Os dois dias desativado contaram: o fim é o mesmo de antes.
    expect(agora.expiraEm!.getTime()).toBe(fim)
  })

  it("o admin desativa e ativa; outro anunciante não (RN-145)", async () => {
    const t = montar()
    const anuncio = await noAr(t)
    expect((await t.ativarOuDesativar.desativar({ usuarioId: "intruso", perfil: "ANUNCIANTE" }, anuncio.id)).ok).toBe(false)
    expect((await t.ativarOuDesativar.desativar({ usuarioId: "admin", perfil: "ADMIN" }, anuncio.id)).ok).toBe(true)
    expect((await t.ativarOuDesativar.ativar({ usuarioId: "intruso", perfil: "ANUNCIANTE" }, anuncio.id)).ok).toBe(false)
    expect((await t.ativarOuDesativar.ativar({ usuarioId: "admin", perfil: "ADMIN" }, anuncio.id)).ok).toBe(true)
  })

  it("não desativa anúncio aguardando pagamento, expirado ou removido (RN-142, RN-145)", async () => {
    const t = montar()
    const r = await t.criar.executar(USUARIO, novo)
    if (!r.ok) throw new Error(r.mensagem)
    expect((await t.ativarOuDesativar.desativar(DONO, r.valor.anuncioId)).ok).toBe(false)

    const vencido = await noAr(t)
    t.relogio.avancarDias(8)
    expect((await t.ativarOuDesativar.desativar(DONO, vencido.id)).ok).toBe(false)

    const removido = await noAr(t)
    await t.remover.executar(DONO, removido.id)
    expect((await t.ativarOuDesativar.desativar(DONO, removido.id)).ok).toBe(false)
    expect((await t.ativarOuDesativar.ativar(DONO, removido.id)).ok).toBe(false)
    expect((await t.anuncios.buscarPorId(removido.id))!.situacao).toBe("REMOVIDO")
  })

  it("desativado com prazo vencido não volta pelo botão; volta pela renovação (RN-142)", async () => {
    const t = montar()
    const anuncio = await noAr(t)
    await t.ativarOuDesativar.desativar(DONO, anuncio.id)
    t.relogio.avancarDias(8)
    const r = await t.ativarOuDesativar.ativar(DONO, anuncio.id)
    expect(r.ok).toBe(false)
    expect((await t.anuncios.buscarPorId(anuncio.id))!.situacao).toBe("DESATIVADO")

    const renovacao = await t.renovar.executar({ ...RENOVA, usuarioId: "usuario-1", anuncioId: anuncio.id })
    if (!renovacao.ok) throw new Error(renovacao.mensagem)
    await t.confirmar.executar({ pagamentoId: renovacao.valor.id, adminId: "admin" })
    const depois = (await t.anuncios.buscarPorId(anuncio.id))!
    expect(depois.situacao).toBe("PUBLICADO")
    expect(depois.expiraEm!.getTime()).toBe(t.relogio.agora().getTime() + 7 * DIA)
  })

  it("pagar a renovação do desativado soma ao fim atual e põe no ar (RN-143)", async () => {
    const t = montar()
    const anuncio = await noAr(t)
    await t.ativarOuDesativar.desativar(DONO, anuncio.id)
    t.relogio.avancarDias(5)
    const renovacao = await t.renovar.executar({ ...RENOVA, usuarioId: "usuario-1", anuncioId: anuncio.id })
    if (!renovacao.ok) throw new Error(renovacao.mensagem)
    await t.confirmar.executar({ pagamentoId: renovacao.valor.id, adminId: "admin" })
    const depois = (await t.anuncios.buscarPorId(anuncio.id))!
    expect(depois.situacao).toBe("PUBLICADO")
    // Restavam 2 dias; com mais 7, fica no ar por 9 dias a partir de agora.
    expect(depois.expiraEm!.getTime()).toBe(t.relogio.agora().getTime() + 9 * DIA)
  })

  it("desativado não recebe mensagem (RN-140)", async () => {
    const t = montar()
    const anuncio = await noAr(t)
    await t.ativarOuDesativar.desativar(DONO, anuncio.id)
    const r = await t.mensagem.executar(anuncio.id, { nome: "Maria", contato: "maria@exemplo.com", texto: "Ainda está à venda?" })
    expect(r.ok).toBe(false)
  })
})

describe("Mensagens (RN-17, RN-18)", () => {
  it("só anúncio no ar recebe mensagem, com limite por contato", async () => {
    const t = montar()
    const r = await t.criar.executar(USUARIO, novo)
    if (!r.ok) throw new Error(r.mensagem)
    const id = r.valor.anuncioId
    const msg = { nome: "Ana", contato: "61999998888", texto: "Ainda está disponível?" }

    expect((await t.mensagem.executar(id, msg)).ok).toBe(false) // aguardando pagamento

    const pendente = (await t.pagamentos.pendenteDoAnuncio(id))!
    await t.confirmar.executar({ pagamentoId: pendente.id, adminId: "admin" })
    for (let i = 0; i < 3; i++) expect((await t.mensagem.executar(id, msg)).ok).toBe(true)
    const quarta = await t.mensagem.executar(id, msg)
    expect(quarta.ok).toBe(false)
    if (!quarta.ok) expect(quarta.codigo).toBe("MUITAS_MENSAGENS")

    t.relogio.avancarDias(8)
    expect((await t.mensagem.executar(id, { ...msg, contato: "outra@pessoa.com" })).ok).toBe(false) // expirou
  })
})

describe("Cadastro do anunciante (RF-01, RN-01, RN-02)", () => {
  const dados = {
    nome: "Maria Souza",
    cpf: "529.982.247-25",
    email: "Maria@Exemplo.com",
    celular: "(61) 99999-8888",
    uf: "DF",
    cidadeCodigo: BRASILIA,
    senha: "senha-forte",
    confirmacaoSenha: "senha-forte",
    aceitouTermos: true,
  }

  it("cria a conta já logada e recusa e-mail ou CPF repetidos", async () => {
    const usuarios = new UsuariosEmMemoria()
    const sessoes = new SessoesEmMemoria()
    const { relogio } = caderno()
    const cadastrar = new CadastrarAnuncianteUseCase(usuarios, sessoes, hashFalso, tokensFalsos, localidades, relogio)

    const r = await cadastrar.executar(dados)
    expect(r.ok).toBe(true)
    const [usuario] = [...usuarios.itens.values()]
    expect(usuario).toMatchObject({ email: "maria@exemplo.com", cpf: "52998224725", celular: "61999998888", perfil: "ANUNCIANTE" })
    expect(sessoes.itens).toHaveLength(1)

    const repetido = await cadastrar.executar({ ...dados, cpf: "111.444.777-35" })
    expect(!repetido.ok && repetido.campos?.email).toBeTruthy()
    const cpfRepetido = await cadastrar.executar({ ...dados, email: "outra@exemplo.com" })
    expect(!cpfRepetido.ok && cpfRepetido.campos?.cpf).toBeTruthy()
  })
})

describe("Categorias (RN-31)", () => {
  it("categoria com anúncios não é excluída", async () => {
    const { categorias } = caderno()
    categorias.anunciosPorCategoria.set("cat-veiculos", 3)
    const remover = new RemoverCategoriaUseCase(categorias)
    expect((await remover.executar("cat-veiculos")).ok).toBe(false)
    expect((await remover.executar("cat-antiga")).ok).toBe(true)
  })
})
