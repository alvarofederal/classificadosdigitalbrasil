// Feature 017: banco de dias (RF-170 a RF-175, RN-170 a RN-181). Dados inventados para o teste.
import { describe, expect, it } from "vitest"
import type { UsuarioRegistro } from "@/application/ports/acesso"
import { ConfirmarEmailUseCase, emitirCodigo } from "@/application/use-cases/acesso/codigo-por-email"
import { CadastrarAnuncianteUseCase } from "@/application/use-cases/acesso/conta"
import { CriarAnuncioUseCase } from "@/application/use-cases/anuncios/gerenciar-anuncios"
import { DarPresenteDeBoasVindasUseCase, UsarDiasDoBancoUseCase } from "@/application/use-cases/banco/banco-de-dias"
import { ConfirmarPagamentoUseCase } from "@/application/use-cases/pagamentos/pagamentos"
import { ESTILO_PADRAO, type ConteudoDoAnuncio } from "@/domain/anuncio/anuncio"
import { conferirUsoDoBanco, diasPorExtenso, precoProporcional } from "@/domain/banco/banco-de-dias"
import { PLANOS_INICIAIS } from "@/domain/plano/plano"
import {
  BancoDeDiasEmMemoria,
  CodigosDoTeste,
  CodigosPorEmailEmMemoria,
  SessoesEmMemoria,
  caderno,
  hashFalso,
  localidades,
  tokensFalsos,
} from "../fakes"

const DIA = 86_400_000
const BRASILIA = 5300108
const DONO = { id: "dono-1", email: "dono@exemplo.com.br" }

const conteudo: ConteudoDoAnuncio = {
  categoriaId: "cat-veiculos",
  uf: "DF",
  cidadeCodigo: BRASILIA,
  titulo: "Vendo bicicleta aro 29",
  texto: "Quadro de alumínio, 21 marchas, pouco uso.",
  precoCentavos: 90_000,
  estilo: ESTILO_PADRAO,
}

function montar({ comGateway = false } = {}) {
  const c = caderno({ comGateway })
  const banco = new BancoDeDiasEmMemoria()
  const confirmar = new ConfirmarPagamentoUseCase(c.anuncios, c.pagamentos, c.relogio)
  const usar = new UsarDiasDoBancoUseCase(c.anuncios, banco, c.depsDePagamento, confirmar)
  const criar = new CriarAnuncioUseCase(c.anuncios, c.categorias, localidades, c.codigos, c.depsDePagamento, { repositorio: banco, usar })
  const presente = new DarPresenteDeBoasVindasUseCase(c.usuarios, banco, c.configuracao, c.relogio)

  function conta(dados: Partial<UsuarioRegistro> = {}): UsuarioRegistro {
    const u: UsuarioRegistro = {
      id: DONO.id,
      nome: "Maria Souza",
      cpf: "52998224725",
      email: DONO.email,
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

  async function anuncioComPix(dias = 7) {
    const r = await criar.executar(DONO, { ...conteudo, planoCodigo: "SIMPLES", dias })
    if (!r.ok) throw new Error(r.mensagem)
    return r.valor.anuncioId
  }

  return { ...c, banco, confirmar, usar, criar, presente, conta, anuncioComPix }
}

describe("Banco de dias: regras do domínio (RN-171, RN-172, RN-180)", () => {
  const agora = new Date("2026-11-15T12:00:00Z")
  const saldo = { SIMPLES: 10, FOTOS: 7 }
  const novo = { situacao: "AGUARDANDO_PAGAMENTO" as const, planoCodigo: "SIMPLES", expiraEm: null }
  const noAr = (planoCodigo: string) => ({ situacao: "PUBLICADO" as const, planoCodigo, expiraEm: new Date(agora.getTime() + 2 * DIA) })

  it("RN-172: anúncio novo ou vencido usa no mínimo 7 dias; anúncio em prazo aceita a partir de 1", () => {
    expect(conferirUsoDoBanco({ tipo: "SIMPLES", dias: 6 }, novo, saldo, agora).dias).toBe("Para pôr o anúncio no caderno, use pelo menos 7 dias.")
    expect(conferirUsoDoBanco({ tipo: "SIMPLES", dias: 7 }, novo, saldo, agora)).toEqual({})
    expect(conferirUsoDoBanco({ tipo: "SIMPLES", dias: 3 }, noAr("SIMPLES"), saldo, agora)).toEqual({})
    const vencido = { situacao: "PUBLICADO" as const, planoCodigo: "SIMPLES", expiraEm: new Date(agora.getTime() - DIA) }
    expect(conferirUsoDoBanco({ tipo: "SIMPLES", dias: 3 }, vencido, saldo, agora).dias).toBeTruthy()
  })

  it("RN-171: anúncio Com foto em prazo só recebe dias com foto; o Simples aceita os dois", () => {
    expect(conferirUsoDoBanco({ tipo: "SIMPLES", dias: 3 }, noAr("FOTOS"), saldo, agora).planoCodigo).toBe("Este anúncio está no plano Com foto: use dias com foto.")
    expect(conferirUsoDoBanco({ tipo: "FOTOS", dias: 3 }, noAr("FOTOS"), saldo, agora)).toEqual({})
    expect(conferirUsoDoBanco({ tipo: "FOTOS", dias: 3 }, noAr("SIMPLES"), saldo, agora)).toEqual({})
  })

  it("RN-173: não usa mais do que o saldo nem tipo desconhecido", () => {
    expect(conferirUsoDoBanco({ tipo: "FOTOS", dias: 8 }, novo, saldo, agora).dias).toBe("Você tem 7 dias com foto no banco.")
    expect(conferirUsoDoBanco({ tipo: "FOTOS", dias: 7 }, novo, { SIMPLES: 0, FOTOS: 0 }, agora).dias).toBe("Você não tem dias com foto no banco.")
    expect(conferirUsoDoBanco({ tipo: "VITRINE", dias: 7 }, novo, saldo, agora).planoCodigo).toBeTruthy()
    expect(conferirUsoDoBanco({ tipo: "SIMPLES", dias: 7.5 }, novo, saldo, agora).dias).toBeTruthy()
  })

  it("RN-180: o dia custa o mesmo em 7, 15 e 30 dias, e a tabela inicial segue a regra", () => {
    expect(precoProporcional(100, 15)).toBe(214)
    expect(precoProporcional(100, 30)).toBe(429)
    expect(precoProporcional(1000, 15)).toBe(2143)
    expect(precoProporcional(1000, 30)).toBe(4286)
    for (const plano of PLANOS_INICIAIS.filter((p) => p.ativo)) {
      expect(plano.precos[15]).toBe(precoProporcional(plano.precos[7]!, 15))
      expect(plano.precos[30]).toBe(precoProporcional(plano.precos[7]!, 30))
    }
    expect(diasPorExtenso(1, "FOTOS")).toBe("1 dia com foto")
    expect(diasPorExtenso(7, "SIMPLES")).toBe("7 dias sem foto")
  })
})

describe("Usar dias do banco (RF-172, RF-173, RN-171 a RN-173, RN-179, RN-181)", () => {
  it("RF-173: anúncio aguardando o Pix vai ao ar com 7 dias com foto; o Pix em aberto é cancelado e o saldo cai", async () => {
    const t = montar()
    await t.banco.creditar(DONO.id, "FOTOS", 7, "BOAS_VINDAS")
    const anuncioId = await t.anuncioComPix()
    const pix = (await t.pagamentos.pendenteDoAnuncio(anuncioId))!

    const r = await t.usar.executar({ usuarioId: DONO.id, anuncioId, tipo: "FOTOS", dias: 7 })
    expect(r.ok && r.valor.expiraEm).toEqual(new Date(t.relogio.agora().getTime() + 7 * DIA))
    expect(await t.anuncios.buscarPorId(anuncioId)).toMatchObject({ situacao: "PUBLICADO", planoCodigo: "FOTOS", prioridade: 1 })
    expect((await t.pagamentos.buscarPorId(pix.id))?.situacao).toBe("CANCELADO")
    // RN-181: o uso fica entre os pagamentos do anúncio, com valor zero e origem "BANCO".
    const doBanco = [...t.pagamentos.itens.values()].find((p) => p.gateway === "BANCO")!
    expect(doBanco).toMatchObject({ situacao: "CONFIRMADO", valorCentavos: 0, dias: 7, planoCodigo: "FOTOS", confirmadoPorId: null })
    expect(await t.banco.saldo(DONO.id)).toEqual({ SIMPLES: 0, FOTOS: 0 })
    expect(t.banco.extrato.map((m) => [m.motivo, m.dias])).toEqual([
      ["BOAS_VINDAS", 7],
      ["USO", -7],
    ])
  })

  it("RN-172: anúncio no ar ganha 3 dias de sobra depois do fim atual", async () => {
    const t = montar()
    await t.banco.creditar(DONO.id, "SIMPLES", 10, "BOAS_VINDAS")
    const anuncioId = await t.anuncioComPix()
    expect((await t.usar.executar({ usuarioId: DONO.id, anuncioId, tipo: "SIMPLES", dias: 7 })).ok).toBe(true)
    const r = await t.usar.executar({ usuarioId: DONO.id, anuncioId, tipo: "SIMPLES", dias: 3 })
    expect(r.ok && r.valor.expiraEm).toEqual(new Date(t.relogio.agora().getTime() + 10 * DIA))
    expect(await t.banco.saldo(DONO.id)).toEqual({ SIMPLES: 0, FOTOS: 0 })
  })

  it("RN-171: anúncio Com foto no ar recusa dias sem foto, e nada sai do banco", async () => {
    const t = montar()
    await t.banco.creditar(DONO.id, "FOTOS", 7, "BOAS_VINDAS")
    await t.banco.creditar(DONO.id, "SIMPLES", 7, "BOAS_VINDAS")
    const anuncioId = await t.anuncioComPix()
    await t.usar.executar({ usuarioId: DONO.id, anuncioId, tipo: "FOTOS", dias: 7 })
    const r = await t.usar.executar({ usuarioId: DONO.id, anuncioId, tipo: "SIMPLES", dias: 7 })
    expect(!r.ok && r.campos?.planoCodigo).toBe("Este anúncio está no plano Com foto: use dias com foto.")
    expect((await t.banco.saldo(DONO.id)).SIMPLES).toBe(7)
  })

  it("anúncio vencido renova com dias do banco, a partir de agora", async () => {
    const t = montar()
    await t.banco.creditar(DONO.id, "SIMPLES", 14, "BOAS_VINDAS")
    const anuncioId = await t.anuncioComPix()
    await t.usar.executar({ usuarioId: DONO.id, anuncioId, tipo: "SIMPLES", dias: 7 })
    t.relogio.avancarDias(9)
    const r = await t.usar.executar({ usuarioId: DONO.id, anuncioId, tipo: "SIMPLES", dias: 7 })
    expect(r.ok && r.valor.expiraEm).toEqual(new Date(t.relogio.agora().getTime() + 7 * DIA))
  })

  it("RN-179: Pix já pago recusa o uso, e os dias voltam ao banco com o registro da devolução", async () => {
    const t = montar({ comGateway: true })
    await t.banco.creditar(DONO.id, "SIMPLES", 7, "BOAS_VINDAS")
    const anuncioId = await t.anuncioComPix()
    const pix = (await t.pagamentos.pendenteDoAnuncio(anuncioId))!
    t.gateway!.pagar(pix.gatewayId!)

    const r = await t.usar.executar({ usuarioId: DONO.id, anuncioId, tipo: "SIMPLES", dias: 7 })
    expect(!r.ok && r.codigo).toBe("PIX_JA_PAGO")
    expect(await t.banco.saldo(DONO.id)).toEqual({ SIMPLES: 7, FOTOS: 0 })
    expect(t.banco.extrato.map((m) => m.motivo)).toEqual(["BOAS_VINDAS", "USO", "DEVOLUCAO"])
    expect((await t.pagamentos.buscarPorId(pix.id))?.situacao).toBe("PENDENTE")
  })

  it("só o dono usa os dias no anúncio; anúncio removido não recebe", async () => {
    const t = montar()
    await t.banco.creditar("outra-pessoa", "SIMPLES", 7, "BOAS_VINDAS")
    const anuncioId = await t.anuncioComPix()
    const alheio = await t.usar.executar({ usuarioId: "outra-pessoa", anuncioId, tipo: "SIMPLES", dias: 7 })
    expect(!alheio.ok && alheio.codigo).toBe("NAO_ENCONTRADO")

    await t.banco.creditar(DONO.id, "SIMPLES", 7, "BOAS_VINDAS")
    const anuncio = (await t.anuncios.buscarPorId(anuncioId))!
    await t.anuncios.atualizar({ ...anuncio, situacao: "REMOVIDO" })
    const removido = await t.usar.executar({ usuarioId: DONO.id, anuncioId, tipo: "SIMPLES", dias: 7 })
    expect(!removido.ok && removido.campos?.planoCodigo).toBe("Este anúncio foi removido.")
    expect((await t.banco.saldo(DONO.id)).SIMPLES).toBe(7)
  })
})

describe("Criar anúncio com dias do banco (RF-172)", () => {
  it("o anúncio nasce no ar, sem cobrança Pix", async () => {
    const t = montar()
    await t.banco.creditar(DONO.id, "FOTOS", 7, "BOAS_VINDAS")
    const r = await t.criar.executar(DONO, { ...conteudo, planoCodigo: "FOTOS", dias: 7, forma: "BANCO" })
    expect(r.ok).toBe(true)
    const anuncioId = r.ok ? r.valor.anuncioId : ""
    expect(await t.anuncios.buscarPorId(anuncioId)).toMatchObject({ situacao: "PUBLICADO", planoCodigo: "FOTOS" })
    expect([...t.pagamentos.itens.values()].map((p) => p.gateway)).toEqual(["BANCO"])
  })

  it("sem saldo, recusa antes de gravar o anúncio", async () => {
    const t = montar()
    await t.banco.creditar(DONO.id, "SIMPLES", 5, "BOAS_VINDAS")
    const r = await t.criar.executar(DONO, { ...conteudo, planoCodigo: "SIMPLES", dias: 7, forma: "BANCO" })
    expect(!r.ok && r.campos?.dias).toBeTruthy()
    expect(t.anuncios.itens.size).toBe(0)
  })

  it("texto inválido aparece junto com o erro do banco", async () => {
    const t = montar()
    const r = await t.criar.executar(DONO, { ...conteudo, titulo: "", planoCodigo: "FOTOS", dias: 7, forma: "BANCO" })
    expect(!r.ok && Object.keys(r.campos ?? {}).sort()).toEqual(["dias", "titulo"])
  })
})

describe("Presente de boas-vindas (RF-174, RN-174)", () => {
  it("7 dias sem foto e 7 com foto, uma vez só", async () => {
    const t = montar()
    t.conta()
    expect(await t.presente.dar(DONO.id)).toBe(true)
    expect(await t.presente.dar(DONO.id)).toBe(false)
    expect(await t.banco.saldo(DONO.id)).toEqual({ SIMPLES: 7, FOTOS: 7 })
    expect(t.banco.extrato.filter((m) => m.motivo === "BOAS_VINDAS")).toHaveLength(2)
  })

  it("não ganham administrador, conta desativada nem e-mail de teste; com o presente desligado, ninguém ganha", async () => {
    const t = montar()
    t.conta({ id: "admin", perfil: "ADMIN" })
    t.conta({ id: "desativada", ativo: false })
    t.conta({ id: "teste", email: "anunciante@demo.classificados.test" })
    t.conta({ id: "normal" })
    t.configuracao.presente = false
    for (const id of ["admin", "desativada", "teste", "normal"]) expect(await t.presente.dar(id)).toBe(false)
    expect(t.banco.extrato).toHaveLength(0)
  })

  it("sai na confirmação do e-mail (feature 016)", async () => {
    const t = montar()
    const u = t.conta({ emailConfirmadoEm: null })
    const deps = { codigosPorEmail: new CodigosPorEmailEmMemoria(), correio: t.correio, codigos: new CodigosDoTeste(["482913"]), tokens: tokensFalsos, relogio: t.relogio }
    await emitirCodigo(deps, u, "CADASTRO", u.email)
    const confirmar = new ConfirmarEmailUseCase(t.usuarios, deps, t.presente)
    expect((await confirmar.executar(u.id, "482913")).ok).toBe(true)
    expect(await t.banco.saldo(u.id)).toEqual({ SIMPLES: 7, FOTOS: 7 })
  })
})

describe("Limite de contas por conexão (RN-176)", () => {
  const dados = (i: number) => ({
    nome: "Pessoa Teste",
    cpf: ["52998224725", "11144477735", "12345678909", "11122233396", "22233344405", "33344455508"][i],
    email: `pessoa${i}@exemplo.com.br`,
    celular: "61999998888",
    uf: "DF",
    cidadeCodigo: BRASILIA,
    senha: "senha-forte",
    confirmacaoSenha: "senha-forte",
    aceitouTermos: true,
    ip: "203.0.113.7",
  })

  it("a sexta conta da mesma conexão no mesmo dia é recusada; no dia seguinte, volta a valer", async () => {
    const t = montar()
    const deps = { codigosPorEmail: new CodigosPorEmailEmMemoria(), correio: t.correio, codigos: new CodigosDoTeste(), tokens: tokensFalsos, relogio: t.relogio }
    const cadastrar = new CadastrarAnuncianteUseCase(t.usuarios, new SessoesEmMemoria(), hashFalso, tokensFalsos, localidades, t.relogio, deps)
    for (let i = 0; i < 5; i++) expect((await cadastrar.executar(dados(i))).ok).toBe(true)
    const sexta = await cadastrar.executar(dados(5))
    expect(!sexta.ok && sexta.codigo).toBe("MUITOS_CADASTROS")
    expect((await cadastrar.executar({ ...dados(5), ip: "198.51.100.20" })).ok).toBe(true)

    // Passadas 24 horas e um minuto, as cinco contas de ontem saem da janela.
    t.relogio.instante = new Date(t.relogio.agora().getTime() + DIA + 60_000)
    t.usuarios.agora = t.relogio.agora()
    expect((await cadastrar.executar({ ...dados(5), email: "pessoa6@exemplo.com.br", cpf: "44455566619" })).ok).toBe(true)
  })
})
