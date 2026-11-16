// Feature 015: convites de cortesia (RF-250 a RF-256, RN-250 a RN-257). Dados inventados para o teste.
import { describe, expect, it } from "vitest"
import type { UsuarioRegistro } from "@/application/ports/acesso"
import { CadastrarAnuncianteUseCase } from "@/application/use-cases/acesso/conta"
import { CriarAnuncioUseCase } from "@/application/use-cases/anuncios/gerenciar-anuncios"
import { UsarDiasDoBancoUseCase } from "@/application/use-cases/banco/banco-de-dias"
import {
  AceitarConviteUseCase,
  CancelarConviteUseCase,
  ConvidarPeloWhatsAppUseCase,
  ConvidarPorEmailUseCase,
  PremiarConviteUseCase,
  VerConviteUseCase,
} from "@/application/use-cases/convites/convites"
import { ConfirmarPagamentoUseCase } from "@/application/use-cases/pagamentos/pagamentos"
import { ESTILO_PADRAO } from "@/domain/anuncio/anuncio"
import { CONVITES_POR_CONTA, VALIDADE_DO_CONVITE_MS, convitesDisponiveis, situacaoDoConvite } from "@/domain/convite/convite"
import {
  BancoDeDiasEmMemoria,
  CodigosDoTeste,
  CodigosPorEmailEmMemoria,
  ConvitesEmMemoria,
  SessoesEmMemoria,
  caderno,
  enderecosDeTeste,
  hashFalso,
  localidades,
  tokensFalsos,
} from "../fakes"

const DIA = 86_400_000
const BRASILIA = 5300108

function montar() {
  const c = caderno()
  const convites = new ConvitesEmMemoria()
  const banco = new BancoDeDiasEmMemoria()
  const codigosDoConvite = new CodigosDoTeste()
  const deps = { convites, usuarios: c.usuarios, configuracao: c.configuracao, codigos: codigosDoConvite, tokens: tokensFalsos, relogio: c.relogio, enderecos: enderecosDeTeste }
  const premiar = new PremiarConviteUseCase(convites, banco, c.relogio)
  const confirmar = new ConfirmarPagamentoUseCase(c.anuncios, c.pagamentos, c.relogio, premiar)
  const usar = new UsarDiasDoBancoUseCase(c.anuncios, banco, c.depsDePagamento, confirmar)
  const criarAnuncio = new CriarAnuncioUseCase(c.anuncios, c.categorias, localidades, c.codigos, c.depsDePagamento, { repositorio: banco, usar })
  const depsDoCodigo = { codigosPorEmail: new CodigosPorEmailEmMemoria(), correio: c.correio, codigos: new CodigosDoTeste(), tokens: tokensFalsos, relogio: c.relogio }
  const aceitar = new AceitarConviteUseCase(deps)
  const cadastrar = new CadastrarAnuncianteUseCase(c.usuarios, new SessoesEmMemoria(), hashFalso, tokensFalsos, localidades, c.relogio, depsDoCodigo, aceitar)

  function conta(dados: Partial<UsuarioRegistro> = {}): UsuarioRegistro {
    const u: UsuarioRegistro = {
      id: "quem-convida",
      nome: "Maria Souza",
      cpf: "52998224725",
      email: "maria@exemplo.com.br",
      celular: "61999998888",
      uf: "DF",
      cidadeCodigo: BRASILIA,
      senhaHash: "hash:x",
      perfil: "ANUNCIANTE",
      ativo: true,
      deveTrocarSenha: false,
      aceitouTermosEm: c.relogio.agora(),
      emailConfirmadoEm: c.relogio.agora(),
      ...dados,
    }
    c.usuarios.itens.set(u.id, u)
    return u
  }

  const cadastro = (email: string, cpf: string, convite: string | null) =>
    cadastrar.executar({
      nome: "Joao Amigo",
      cpf,
      email,
      celular: "61988887777",
      uf: "DF",
      cidadeCodigo: BRASILIA,
      senha: "senha-forte",
      confirmacaoSenha: "senha-forte",
      aceitouTermos: true,
      convite,
    })

  return {
    ...c,
    convites,
    banco,
    codigosDoConvite,
    conta,
    cadastro,
    criarAnuncio,
    porEmail: new ConvidarPorEmailUseCase(deps, c.correio),
    peloWhatsApp: new ConvidarPeloWhatsAppUseCase(deps),
    ver: new VerConviteUseCase(deps),
    cancelar: new CancelarConviteUseCase(deps),
  }
}

describe("Convites: regras do domínio (RN-250, RN-251)", () => {
  const agora = new Date("2026-11-16T12:00:00Z")
  const base = { expiraEm: new Date(agora.getTime() + DIA), aceitoEm: null, premiadoEm: null, canceladoEm: null }

  it("situação: aguardando, aceito, premiado, vencido e cancelado", () => {
    expect(situacaoDoConvite(base, agora)).toBe("AGUARDANDO")
    expect(situacaoDoConvite({ ...base, aceitoEm: agora }, agora)).toBe("ACEITO")
    expect(situacaoDoConvite({ ...base, aceitoEm: agora, premiadoEm: agora }, agora)).toBe("PREMIADO")
    expect(situacaoDoConvite({ ...base, expiraEm: agora }, agora)).toBe("VENCIDO")
    expect(situacaoDoConvite({ ...base, canceladoEm: agora }, agora)).toBe("CANCELADO")
  })

  it("RN-250: ocupam vaga o aceito e o que ainda vale; vencido e cancelado voltam", () => {
    const vencido = { ...base, expiraEm: new Date(agora.getTime() - 1) }
    const cancelado = { ...base, canceladoEm: agora }
    const aceito = { ...base, aceitoEm: agora }
    expect(convitesDisponiveis([], agora)).toBe(CONVITES_POR_CONTA)
    expect(convitesDisponiveis([base, aceito, vencido, cancelado], agora)).toBe(3)
  })
})

describe("Convidar (RF-250 a RF-252, RN-251 a RN-253)", () => {
  it("RF-251: por e-mail, manda a carta com o link e o presente, e o convite vale 30 dias", async () => {
    const t = montar()
    t.conta()
    t.codigosDoConvite.proximos = ["ABCDEFGHJKMN"]
    const r = await t.porEmail.executar("quem-convida", " Joao.Amigo@Exemplo.com.br ")
    expect(r.ok && r.valor.email).toBe("joao.amigo@exemplo.com.br")
    const carta = t.correio.enviadas.at(-1)!
    expect(carta.para.email).toBe("joao.amigo@exemplo.com.br")
    expect(carta.carta.assunto).toBe("Maria convidou você para o Classificados Digitais do Brasil")
    expect(carta.carta.botao?.url).toBe("https://classificados.teste/convite/ABCDEFGHJKMN")
    expect(carta.carta.paragrafos.join(" ")).toContain("7 dias sem foto e 7 dias com foto")
    expect(JSON.stringify(carta.carta)).not.toContain("Souza")
    const convite = t.convites.itens[0]
    expect(convite).toMatchObject({ canal: "EMAIL", emailDestino: "joao.amigo@exemplo.com.br", codigoHash: tokensFalsos.hash("ABCDEFGHJKMN") })
    expect(convite.expiraEm.getTime() - convite.criadoEm.getTime()).toBe(VALIDADE_DO_CONVITE_MS)
  })

  it("RN-253: recusa o próprio e-mail, e-mail com conta, e-mail já convidado e e-mail de teste", async () => {
    const t = montar()
    t.conta()
    t.conta({ id: "outra", email: "fulano@gmail.com", cpf: "11144477735" })
    expect((await t.porEmail.executar("quem-convida", "maria+x@exemplo.com.br")).ok).toBe(false)
    const comConta = await t.porEmail.executar("quem-convida", "f.ulano@gmail.com")
    expect(!comConta.ok && comConta.campos?.email).toBe("Este e-mail já tem conta no Classificados.")
    expect((await t.porEmail.executar("quem-convida", "amigo@exemplo.com.br")).ok).toBe(true)
    const repetido = await t.porEmail.executar("quem-convida", "Amigo@exemplo.com.br")
    expect(!repetido.ok && repetido.campos?.email).toBe("Você já convidou este e-mail; o convite ainda vale.")
    expect((await t.porEmail.executar("quem-convida", "amigo@site.test")).ok).toBe(false)
  })

  it("RF-252: pelo WhatsApp, devolve o texto com o link", async () => {
    const t = montar()
    t.conta()
    t.codigosDoConvite.proximos = ["WHATS2345678"]
    const r = await t.peloWhatsApp.executar("quem-convida")
    expect(r.ok && r.valor.link).toBe("https://classificados.teste/convite/WHATS2345678")
    // Redação do Álvaro (2026-11-16), uma ideia por linha.
    expect(r.ok && r.valor.texto).toBe(
      [
        "Estou anunciando no novo Classificados Digitais do Brasil, os classificados da cidade com cara de jornal.",
        "Criando a conta, você ganha 1 anúncio por 7 dias sem foto e outro anúncio por 7 dias com foto de graça.",
        "Este é o meu convite para você:",
        "https://classificados.teste/convite/WHATS2345678",
      ].join("\n"),
    )
    expect(t.convites.itens[0]).toMatchObject({ canal: "WHATSAPP", emailDestino: null })
    // Com o presente desligado, a linha do presente some.
    t.configuracao.presente = false
    const semPresente = await t.peloWhatsApp.executar("quem-convida")
    expect(semPresente.ok && semPresente.valor.texto.split("\n")).toHaveLength(3)
  })

  it("RN-250: no sexto convite, recusa; cancelando um, ele volta", async () => {
    const t = montar()
    t.conta()
    for (let i = 0; i < 5; i++) expect((await t.peloWhatsApp.executar("quem-convida")).ok).toBe(true)
    const sexto = await t.peloWhatsApp.executar("quem-convida")
    expect(!sexto.ok && sexto.codigo).toBe("SEM_CONVITES")
    expect((await t.cancelar.executar("quem-convida", t.convites.itens[0].id)).ok).toBe(true)
    expect((await t.peloWhatsApp.executar("quem-convida")).ok).toBe(true)
  })

  it("RN-251: o convite vencido volta para quem convidou", async () => {
    const t = montar()
    t.conta()
    for (let i = 0; i < 5; i++) await t.peloWhatsApp.executar("quem-convida")
    t.relogio.instante = new Date(t.relogio.agora().getTime() + VALIDADE_DO_CONVITE_MS)
    expect((await t.peloWhatsApp.executar("quem-convida")).ok).toBe(true)
  })

  it("RN-255: com os convites desligados, não se convida", async () => {
    const t = montar()
    t.conta()
    t.configuracao.convites = false
    const r = await t.peloWhatsApp.executar("quem-convida")
    expect(!r.ok && r.codigo).toBe("CONVITES_DESLIGADOS")
  })
})

describe("Aceitar e premiar (RF-253, RF-254, RN-252, RN-254, RN-257)", () => {
  it("RF-254: o amigo cria a conta pelo convite e publica com o presente; quem convidou ganha 7 dias com foto, uma vez", async () => {
    const t = montar()
    t.conta()
    t.codigosDoConvite.proximos = ["WHATS2345678"]
    await t.peloWhatsApp.executar("quem-convida")
    const pagina = await t.ver.executar("whats2345678")
    expect(pagina.ok && pagina.valor.nomeDeQuemConvida).toBe("Maria")

    expect((await t.cadastro("joao@exemplo.com.br", "11144477735", "WHATS2345678")).ok).toBe(true)
    const amigo = [...t.usuarios.itens.values()].find((u) => u.email === "joao@exemplo.com.br")!
    expect(t.convites.itens[0].aceitoPorId).toBe(amigo.id)

    // RN-257: o amigo tem o presente de toda conta nova; aqui, os dias postos direto no banco.
    await t.banco.creditar(amigo.id, "SIMPLES", 14, "BOAS_VINDAS")
    const anuncio = (i: number) =>
      t.criarAnuncio.executar(amigo, {
        categoriaId: "cat-veiculos",
        uf: "DF",
        cidadeCodigo: BRASILIA,
        titulo: `Bicicleta ${i}`,
        texto: "Pouco uso.",
        precoCentavos: null,
        estilo: ESTILO_PADRAO,
        planoCodigo: "SIMPLES",
        dias: 7,
        forma: "BANCO",
      })
    expect((await anuncio(1)).ok).toBe(true)
    expect(await t.banco.saldo("quem-convida")).toEqual({ SIMPLES: 0, FOTOS: 7 })
    expect(t.banco.extrato.find((m) => m.usuarioId === "quem-convida")?.motivo).toBe("CONVITE")
    // RN-254: o segundo anúncio do amigo não dá outro prêmio.
    expect((await anuncio(2)).ok).toBe(true)
    expect(await t.banco.saldo("quem-convida")).toEqual({ SIMPLES: 0, FOTOS: 7 })
  })

  it("RN-252: o convite por e-mail só liga a conta criada com aquele e-mail; a conta é criada mesmo assim", async () => {
    const t = montar()
    t.conta()
    t.codigosDoConvite.proximos = ["MAIL23456789"]
    await t.porEmail.executar("quem-convida", "joao@exemplo.com.br")
    expect((await t.cadastro("outro@exemplo.com.br", "11144477735", "MAIL23456789")).ok).toBe(true)
    expect(t.convites.itens[0].aceitoPorId).toBeNull()
    expect((await t.cadastro("joao@exemplo.com.br", "12345678909", "MAIL23456789")).ok).toBe(true)
    expect(t.convites.itens[0].aceitoPorId).not.toBeNull()
  })

  it("link desconhecido, vencido ou já usado não vale; a página diz que não vale mais", async () => {
    const t = montar()
    t.conta()
    t.codigosDoConvite.proximos = ["WHATS2345678"]
    await t.peloWhatsApp.executar("quem-convida")
    expect((await t.ver.executar("NAOEXISTE234")).ok).toBe(false)
    await t.cadastro("joao@exemplo.com.br", "11144477735", "WHATS2345678")
    const usado = await t.ver.executar("WHATS2345678")
    expect(!usado.ok && usado.mensagem).toBe("Este convite não vale mais.")

    t.codigosDoConvite.proximos = ["VENCE2345678"]
    await t.peloWhatsApp.executar("quem-convida")
    t.relogio.instante = new Date(t.relogio.agora().getTime() + VALIDADE_DO_CONVITE_MS)
    expect((await t.ver.executar("VENCE2345678")).ok).toBe(false)
  })

  it("RN-255: com os convites desligados, o link não liga a conta nova", async () => {
    const t = montar()
    t.conta()
    t.codigosDoConvite.proximos = ["WHATS2345678"]
    await t.peloWhatsApp.executar("quem-convida")
    t.configuracao.convites = false
    expect((await t.cadastro("joao@exemplo.com.br", "11144477735", "WHATS2345678")).ok).toBe(true)
    expect(t.convites.itens[0].aceitoPorId).toBeNull()
  })

  it("RF-255: só quem convidou cancela, e só o convite ainda não aceito", async () => {
    const t = montar()
    t.conta()
    t.codigosDoConvite.proximos = ["WHATS2345678"]
    await t.peloWhatsApp.executar("quem-convida")
    const id = t.convites.itens[0].id
    expect((await t.cancelar.executar("outra-pessoa", id)).ok).toBe(false)
    await t.cadastro("joao@exemplo.com.br", "11144477735", "WHATS2345678")
    expect((await t.cancelar.executar("quem-convida", id)).ok).toBe(false)
  })
})
