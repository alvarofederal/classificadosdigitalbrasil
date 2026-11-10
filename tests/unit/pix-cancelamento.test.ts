// Feature 006, T-86 — cobrança cancelada aqui deixa de ser pagável no Mercado Pago (RN-87 a RN-89).
import { afterEach, describe, expect, it, vi } from "vitest"
import { CriarAnuncioUseCase, RemoverAnuncioUseCase } from "@/application/use-cases/anuncios/gerenciar-anuncios"
import {
  ConfirmarPagamentoUseCase,
  ProcessarPagamentoDoGatewayUseCase,
  PublicarCortesiaUseCase,
  SolicitarRenovacaoUseCase,
  VerificarPagamentoUseCase,
} from "@/application/use-cases/pagamentos/pagamentos"
import { ESTILO_PADRAO } from "@/domain/anuncio/anuncio"
import { MercadoPagoGateway } from "@/infrastructure/pagamentos/mercado-pago"
import { caderno, localidades } from "../fakes"

const ORDEM = "ORD01HRYFWNYRE1MR1E60MW3X0T2P"
const USUARIO = { id: "dono", email: "dono@exemplo.com" }
const DONO = { usuarioId: USUARIO.id, perfil: "ANUNCIANTE" as const }
const conteudo = {
  categoriaId: "cat-veiculos",
  uf: "DF",
  cidadeCodigo: 5300108,
  titulo: "Vendo Gol G4",
  texto: "Excelente estado, 2011, vermelho.",
  precoCentavos: 2_400_000,
  estilo: ESTILO_PADRAO,
}

function montar(comGateway = true) {
  const c = caderno({ comGateway })
  const confirmar = new ConfirmarPagamentoUseCase(c.anuncios, c.pagamentos, c.relogio)
  const processar = new ProcessarPagamentoDoGatewayUseCase(c.pagamentos, c.gateway, confirmar)
  return {
    ...c,
    criar: new CriarAnuncioUseCase(c.anuncios, c.categorias, localidades, c.codigos, c.depsDePagamento),
    renovar: new SolicitarRenovacaoUseCase(c.anuncios, c.depsDePagamento),
    remover: new RemoverAnuncioUseCase(c.anuncios, c.pagamentos, c.gateway),
    cortesia: new PublicarCortesiaUseCase(c.anuncios, c.depsDePagamento, confirmar),
    processar,
    verificar: new VerificarPagamentoUseCase(c.anuncios, c.pagamentos, processar),
  }
}

/** Anúncio Simples de 7 dias aguardando o Pix. */
async function anuncioComPix(t: ReturnType<typeof montar>) {
  const r = await t.criar.executar(USUARIO, { ...conteudo, planoCodigo: "SIMPLES", dias: 7 })
  if (!r.ok) throw new Error(r.mensagem)
  const pendente = (await t.pagamentos.pendenteDoAnuncio(r.valor.anuncioId))!
  return { anuncioId: r.valor.anuncioId, pendente }
}

const trocarDePlano = (t: ReturnType<typeof montar>, anuncioId: string) =>
  t.renovar.executar({ usuarioId: USUARIO.id, email: USUARIO.email, anuncioId, planoCodigo: "FOTOS", dias: 10 })

afterEach(() => vi.restoreAllMocks())

describe("Cobrança cancelada aqui sai do gateway (RN-87)", () => {
  it("trocar de plano cancela a ordem antiga antes de gerar a nova", async () => {
    const t = montar()
    const { anuncioId, pendente } = await anuncioComPix(t)

    const nova = await trocarDePlano(t, anuncioId)
    expect(nova.ok && nova.valor.valorCentavos).toBe(4000)
    expect(t.gateway!.canceladas).toEqual([pendente.gatewayId])
    expect((await t.pagamentos.buscarPorId(pendente.id))!.situacao).toBe("CANCELADO")
    // O Pix antigo já não pode ser pago.
    expect((await t.gateway!.consultar(pendente.gatewayId!)).situacao).toBe("RECUSADO")
  })

  it("Pix vencido: gerar outro cancela o antigo no gateway (RN-83)", async () => {
    const t = montar()
    const { anuncioId, pendente } = await anuncioComPix(t)
    t.relogio.avancarDias(2)

    const outro = await t.renovar.executar({ usuarioId: USUARIO.id, email: USUARIO.email, anuncioId, planoCodigo: "SIMPLES", dias: 7 })
    expect(outro.ok && outro.valor.id).not.toBe(pendente.id)
    expect(t.gateway!.canceladas).toEqual([pendente.gatewayId])
  })

  it("pedir de novo a mesma cobrança, ainda válida, não cancela nada", async () => {
    const t = montar()
    const { anuncioId, pendente } = await anuncioComPix(t)

    const mesma = await t.renovar.executar({ usuarioId: USUARIO.id, email: USUARIO.email, anuncioId, planoCodigo: "SIMPLES", dias: 7 })
    expect(mesma.ok && mesma.valor.id).toBe(pendente.id)
    expect(t.gateway!.canceladas).toEqual([])
  })

  it("remover o anúncio cancela o Pix pendente no gateway (RN-14)", async () => {
    const t = montar()
    const { anuncioId, pendente } = await anuncioComPix(t)

    expect((await t.remover.executar(DONO, anuncioId)).ok).toBe(true)
    expect(t.gateway!.canceladas).toEqual([pendente.gatewayId])
    expect((await t.pagamentos.buscarPorId(pendente.id))!.situacao).toBe("CANCELADO")
  })

  it("cortesia cancela o Pix pendente no gateway (RF-84)", async () => {
    const t = montar()
    const { anuncioId, pendente } = await anuncioComPix(t)

    expect((await t.cortesia.executar({ adminId: "admin", anuncioId, planoCodigo: "FOTOS", dias: 30 })).ok).toBe(true)
    expect(t.gateway!.canceladas).toEqual([pendente.gatewayId])
    expect((await t.anuncios.buscarPorId(anuncioId))!.situacao).toBe("PUBLICADO")
  })

  it("Pix estático não tem o que cancelar no gateway", async () => {
    const t = montar(false)
    const { anuncioId, pendente } = await anuncioComPix(t)
    expect(pendente.gateway).toBeNull()

    expect((await trocarDePlano(t, anuncioId)).ok).toBe(true)
    expect((await t.remover.executar(DONO, anuncioId)).ok).toBe(true)
  })

  it("gateway fora do ar no cancelamento não trava a troca de plano nem a remoção", async () => {
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => undefined)
    const t = montar()
    const { anuncioId, pendente } = await anuncioComPix(t)
    t.gateway!.falharAoCancelar = true

    expect((await trocarDePlano(t, anuncioId)).ok).toBe(true)
    expect((await t.pagamentos.buscarPorId(pendente.id))!.situacao).toBe("CANCELADO")
    expect(aviso).toHaveBeenCalledWith(expect.stringContaining(pendente.codigo))
    expect((await t.remover.executar(DONO, anuncioId)).ok).toBe(true)
  })
})

describe("Pix já pago na hora de cancelar (RN-88)", () => {
  it("a troca de plano é recusada, a cobrança segue pendente e a confirmação publica o plano pago", async () => {
    const t = montar()
    const { anuncioId, pendente } = await anuncioComPix(t)
    t.gateway!.pagar(pendente.gatewayId!)

    const troca = await trocarDePlano(t, anuncioId)
    expect(!troca.ok && troca.codigo).toBe("PIX_JA_PAGO")
    expect((await t.pagamentos.buscarPorId(pendente.id))!.situacao).toBe("PENDENTE")
    expect(t.gateway!.cobrancas).toHaveLength(1)

    // A tela do anunciante consulta e o anúncio entra no ar pelo que foi pago.
    expect(await t.verificar.executar({ usuarioId: USUARIO.id, anuncioId })).toEqual({ pago: true })
    expect(await t.anuncios.buscarPorId(anuncioId)).toMatchObject({ situacao: "PUBLICADO", planoCodigo: "SIMPLES" })
  })

  it("a cortesia espera a confirmação do Pix que o anunciante já pagou", async () => {
    const t = montar()
    const { anuncioId, pendente } = await anuncioComPix(t)
    t.gateway!.pagar(pendente.gatewayId!)

    const r = await t.cortesia.executar({ adminId: "admin", anuncioId, planoCodigo: "FOTOS", dias: 30 })
    expect(!r.ok && r.codigo).toBe("PIX_JA_PAGO")
    expect((await t.pagamentos.buscarPorId(pendente.id))!.situacao).toBe("PENDENTE")
  })

  it("a remoção segue mesmo com o Pix pago, e o caso fica no log", async () => {
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => undefined)
    const t = montar()
    const { anuncioId, pendente } = await anuncioComPix(t)
    t.gateway!.pagar(pendente.gatewayId!)

    expect((await t.remover.executar(DONO, anuncioId)).ok).toBe(true)
    expect((await t.anuncios.buscarPorId(anuncioId))!.situacao).toBe("REMOVIDO")
    expect(aviso).toHaveBeenCalledWith(expect.stringContaining(pendente.codigo))
  })
})

describe("Pix pago depois do cancelamento (RN-89)", () => {
  it("não publica nada e volta como falha própria, para o admin devolver ou dar cortesia", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined)
    const t = montar()
    const { anuncioId, pendente } = await anuncioComPix(t)
    // O gateway não respondeu ao cancelamento: o Pix antigo continuou pagável.
    t.gateway!.falharAoCancelar = true
    const nova = await trocarDePlano(t, anuncioId)
    if (!nova.ok) throw new Error(nova.mensagem)

    t.gateway!.pagar(pendente.gatewayId!)
    const r = await t.processar.executar(pendente.gatewayId!)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.codigo).toBe("PAGO_APOS_CANCELAMENTO")
      expect(r.mensagem).toContain(pendente.codigo)
    }
    expect((await t.anuncios.buscarPorId(anuncioId))!.situacao).toBe("AGUARDANDO_PAGAMENTO")
    expect((await t.pagamentos.buscarPorId(nova.valor.id))!.situacao).toBe("PENDENTE")
  })

  it("aviso repetido de cobrança já confirmada continua sendo só 'já processado' (RN-81)", async () => {
    const t = montar()
    const { pendente } = await anuncioComPix(t)
    t.gateway!.pagar(pendente.gatewayId!)
    await t.processar.executar(pendente.gatewayId!)
    const segunda = await t.processar.executar(pendente.gatewayId!)
    expect(segunda.ok && segunda.valor).toBe("JA_PROCESSADO")
  })
})

describe("Adaptador do Mercado Pago: cancelar a ordem (RN-87, RN-88)", () => {
  type Chamada = { url: string; init: RequestInit | undefined }

  /** `aoCancelar` responde o POST de cancelamento; `ordem` responde a consulta que vem depois de um 409. */
  function gatewayCom(aoCancelar: () => Response, ordem?: object) {
    const chamadas: Chamada[] = []
    const falso = (async (url: string, init?: RequestInit) => {
      chamadas.push({ url, init })
      if (init?.method === "POST") return aoCancelar()
      return new Response(JSON.stringify(ordem ?? {}), { status: ordem ? 200 : 404 })
    }) as unknown as typeof fetch
    return { chamadas, gw: new MercadoPagoGateway("token", falso) }
  }
  const resposta = (status: number, corpo: object = {}) => () => new Response(JSON.stringify(corpo), { status })
  const ordemEm = (status: string) => ({ id: ORDEM, status, total_amount: "1.00", external_reference: "ABCDEFGHJK" })

  it("POST /v1/orders/{id}/cancel com chave de idempotência própria", async () => {
    const { chamadas, gw } = gatewayCom(resposta(200, { id: ORDEM, status: "canceled" }))
    expect(await gw.cancelar(ORDEM)).toBe("CANCELADA")
    expect(chamadas).toHaveLength(1)
    expect(chamadas[0].url).toBe(`https://api.mercadopago.com/v1/orders/${ORDEM}/cancel`)
    expect(chamadas[0].init?.method).toBe("POST")
    const cabecalhos = chamadas[0].init?.headers as Record<string, string>
    expect(cabecalhos.Authorization).toBe("Bearer token")
    expect(cabecalhos["X-Idempotency-Key"]).toBe(`cancelar-${ORDEM}`)
  })

  it("409: a consulta diz se o Pix foi pago, se já não pode ser pago ou se a situação é incerta", async () => {
    const recusa = resposta(409, { errors: [{ code: "cannot_cancel_order" }] })
    expect(await gatewayCom(recusa, ordemEm("processed")).gw.cancelar(ORDEM)).toBe("JA_PAGA")
    expect(await gatewayCom(recusa, ordemEm("canceled")).gw.cancelar(ORDEM)).toBe("CANCELADA")
    expect(await gatewayCom(recusa, ordemEm("expired")).gw.cancelar(ORDEM)).toBe("CANCELADA")
    expect(await gatewayCom(recusa, ordemEm("processing")).gw.cancelar(ORDEM)).toBe("FALHOU")

    const { chamadas, gw } = gatewayCom(recusa, ordemEm("processed"))
    await gw.cancelar(ORDEM)
    expect(chamadas.map((c) => c.url)).toEqual([`https://api.mercadopago.com/v1/orders/${ORDEM}/cancel`, `https://api.mercadopago.com/v1/orders/${ORDEM}`])
  })

  it("ordem inexistente conta como cancelada; erro do Mercado Pago e rede fora viram falha, sem exceção", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => undefined)
    expect(await gatewayCom(resposta(404)).gw.cancelar(ORDEM)).toBe("CANCELADA")
    expect(await gatewayCom(resposta(500)).gw.cancelar(ORDEM)).toBe("FALHOU")
    expect(await gatewayCom(resposta(429)).gw.cancelar(ORDEM)).toBe("FALHOU")
    const semRede = gatewayCom(() => {
      throw new Error("fetch failed")
    })
    expect(await semRede.gw.cancelar(ORDEM)).toBe("FALHOU")
    expect(erro).toHaveBeenCalled()
  })

  it("identificador que não é de ordem nem chama a API", async () => {
    const { chamadas, gw } = gatewayCom(resposta(200))
    expect(await gw.cancelar("123456")).toBe("CANCELADA")
    expect(await gw.cancelar("ORD../users/me")).toBe("CANCELADA")
    expect(chamadas).toHaveLength(0)
  })
})
