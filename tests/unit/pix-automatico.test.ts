// Feature 006 (Pix automático), 003 (planos), 004 (chamados) e 007 (cortesia) nos casos de uso.
import { createHmac } from "crypto"
import { describe, expect, it } from "vitest"
import { AbrirChamadoUseCase, LocalizarCidadeUseCase } from "@/application/use-cases/publico/publico"
import { AtualizarPlanoUseCase } from "@/application/use-cases/admin/administracao"
import { CriarAnuncioUseCase, RemoverAnuncioUseCase } from "@/application/use-cases/anuncios/gerenciar-anuncios"
import { AdicionarFotosUseCase, PrepararUploadDeFotosUseCase } from "@/application/use-cases/anuncios/gerenciar-fotos"
import {
  ConfirmarPagamentoUseCase,
  MontarCobrancaPixUseCase,
  ProcessarPagamentoDoGatewayUseCase,
  PublicarCortesiaUseCase,
  SolicitarRenovacaoUseCase,
  VerificarPagamentoUseCase,
} from "@/application/use-cases/pagamentos/pagamentos"
import { ESTILO_PADRAO } from "@/domain/anuncio/anuncio"
import {
  MercadoPagoGateway,
  PagamentoNaoEncontradoNoMercadoPago,
  contaDoMercadoPago,
  assinaturaDoMercadoPagoConfere,
  centavosDoMercadoPago,
  duracaoAteVencer,
  ehAvisoDeOrdem,
  reaisParaOMercadoPago,
  situacaoDoMercadoPago,
} from "@/infrastructure/pagamentos/mercado-pago"
import { ChamadosEmMemoria, CodigosEmSequencia, RelogioFixo, caderno, localidades, storageFalso } from "../fakes"

const DIA = 86_400_000
const ORDEM = "ORD01HRYFWNYRE1MR1E60MW3X0T2P"
const USUARIO = { id: "dono", email: "dono@exemplo.com" }
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
    confirmar,
    processar,
    verificar: new VerificarPagamentoUseCase(c.anuncios, c.pagamentos, processar),
    cortesia: new PublicarCortesiaUseCase(c.anuncios, c.depsDePagamento, confirmar),
    remover: new RemoverAnuncioUseCase(c.anuncios, c.pagamentos, c.gateway),
    cobranca: new MontarCobrancaPixUseCase(c.configuracao),
  }
}

async function anuncioNoPlano(t: ReturnType<typeof montar>, planoCodigo: string, dias: number) {
  const r = await t.criar.executar(USUARIO, { ...conteudo, planoCodigo, dias })
  if (!r.ok) throw new Error(r.mensagem)
  const pendente = (await t.pagamentos.pendenteDoAnuncio(r.valor.anuncioId))!
  return { anuncioId: r.valor.anuncioId, pendente }
}

describe("Plano e período na cobrança (RN-53)", () => {
  it("Com foto 30 dias custa R$ 250,00 e o Pix vem do gateway", async () => {
    const t = montar()
    const { pendente } = await anuncioNoPlano(t, "FOTOS", 30)
    expect(pendente).toMatchObject({ planoCodigo: "FOTOS", dias: 30, valorCentavos: 25000, gateway: "MERCADO_PAGO" })
    expect(pendente.copiaECola).toContain(pendente.codigo)
    expect(t.gateway!.cobrancas).toHaveLength(1)
    expect((await t.cobranca.executar(pendente)).automatico).toBe(true)
  })

  it("recusa 1 dia, plano fora de venda e período que o plano não vende (RN-56)", async () => {
    const t = montar()
    const r = await t.criar.executar(USUARIO, { ...conteudo, planoCodigo: "VITRINE", dias: 1 })
    expect(!r.ok && Object.keys(r.campos ?? {}).sort()).toEqual(["dias", "planoCodigo"])
    t.planos.itens = t.planos.itens.map((p) => (p.codigo === "FOTOS" ? { ...p, precos: { 7: 1000 } } : p))
    const semPeriodo = await t.criar.executar(USUARIO, { ...conteudo, planoCodigo: "FOTOS", dias: 15 })
    expect(!semPeriodo.ok && semPeriodo.campos?.dias).toBe("Este plano não tem esse período.")
    expect((await t.criar.executar(USUARIO, { ...conteudo, planoCodigo: "SIMPLES", dias: 15 })).ok).toBe(true)
  })

  it("gateway fora do ar cai no Pix estático (RF-83)", async () => {
    const t = montar()
    t.gateway!.falhar = true
    const { pendente } = await anuncioNoPlano(t, "SIMPLES", 7)
    expect(pendente.gateway).toBeNull()
    expect((await t.cobranca.executar(pendente)).automatico).toBe(false)
  })

  it("trocar o plano na renovação cancela a cobrança anterior e cobra o novo valor", async () => {
    const t = montar()
    const { anuncioId, pendente } = await anuncioNoPlano(t, "SIMPLES", 7)
    const r = await t.renovar.executar({ usuarioId: USUARIO.id, email: USUARIO.email, anuncioId, planoCodigo: "FOTOS", dias: 10 })
    expect(r.ok && r.valor.valorCentavos).toBe(4000)
    expect((await t.pagamentos.buscarPorId(pendente.id))!.situacao).toBe("CANCELADO")
  })
})

describe("Webhook e confirmação automática (RN-80, RN-81)", () => {
  it("Pix aprovado publica no plano pago, com a prioridade dele", async () => {
    const t = montar()
    const { anuncioId, pendente } = await anuncioNoPlano(t, "FOTOS", 30)
    t.gateway!.pagar(pendente.gatewayId!)
    const r = await t.processar.executar(pendente.gatewayId!)
    expect(r.ok && r.valor).toBe("CONFIRMADO")
    const anuncio = (await t.anuncios.buscarPorId(anuncioId))!
    expect(anuncio).toMatchObject({ situacao: "PUBLICADO", planoCodigo: "FOTOS", prioridade: 1 })
    expect(anuncio.expiraEm!.getTime()).toBe(t.relogio.agora().getTime() + 30 * DIA)
    expect((await t.pagamentos.buscarPorId(pendente.id))!.confirmadoPorId).toBeNull()
  })

  it("aviso repetido não confirma duas vezes", async () => {
    const t = montar()
    const { anuncioId, pendente } = await anuncioNoPlano(t, "SIMPLES", 7)
    t.gateway!.pagar(pendente.gatewayId!)
    await t.processar.executar(pendente.gatewayId!)
    const segunda = await t.processar.executar(pendente.gatewayId!)
    expect(segunda.ok && segunda.valor).toBe("JA_PROCESSADO")
    expect((await t.anuncios.buscarPorId(anuncioId))!.expiraEm!.getTime()).toBe(t.relogio.agora().getTime() + 7 * DIA)
  })

  it("valor pago diferente do cobrado fica pendente", async () => {
    const t = montar()
    const { anuncioId, pendente } = await anuncioNoPlano(t, "FOTOS", 30)
    t.gateway!.pagar(pendente.gatewayId!, 100)
    const r = await t.processar.executar(pendente.gatewayId!)
    expect(!r.ok && r.codigo).toBe("VALOR_DIVERGENTE")
    expect((await t.anuncios.buscarPorId(anuncioId))!.situacao).toBe("AGUARDANDO_PAGAMENTO")
  })

  it("ainda não pago: nada muda; a tela do dono consulta e vê quando cai (RF-82)", async () => {
    const t = montar()
    const { anuncioId, pendente } = await anuncioNoPlano(t, "SIMPLES", 7)
    expect(await t.verificar.executar({ usuarioId: USUARIO.id, anuncioId })).toEqual({ pago: false })
    t.gateway!.pagar(pendente.gatewayId!)
    expect(await t.verificar.executar({ usuarioId: USUARIO.id, anuncioId })).toEqual({ pago: true })
    expect(await t.verificar.executar({ usuarioId: "outro", anuncioId })).toEqual({ pago: false })
  })
})

describe("Cortesia do admin (RF-84)", () => {
  it("publica sem cobrança, cancela o Pix pendente e registra valor zero", async () => {
    const t = montar()
    const { anuncioId, pendente } = await anuncioNoPlano(t, "SIMPLES", 7)
    const r = await t.cortesia.executar({ adminId: "admin", anuncioId, planoCodigo: "VITRINE", dias: 30 })
    expect(r.ok).toBe(true)
    expect((await t.pagamentos.buscarPorId(pendente.id))!.situacao).toBe("CANCELADO")
    const pagos = [...t.pagamentos.itens.values()].filter((p) => p.situacao === "CONFIRMADO")
    expect(pagos).toHaveLength(1)
    expect(pagos[0]).toMatchObject({ gateway: "CORTESIA", valorCentavos: 0, planoCodigo: "VITRINE", confirmadoPorId: "admin" })
    expect((await t.anuncios.buscarPorId(anuncioId))!.planoCodigo).toBe("VITRINE")
  })
})

describe("Fotos por plano (RN-51)", () => {
  it("Simples não tem foto (RN-57); Com foto aceita 6; o admin sobe fotos em qualquer plano", async () => {
    const t = montar(false)
    const { anuncioId } = await anuncioNoPlano(t, "SIMPLES", 7)
    const preparar = new PrepararUploadDeFotosUseCase(t.anuncios, t.fotos, storageFalso, t.planos)
    const adicionar = new AdicionarFotosUseCase(t.anuncios, t.fotos, storageFalso, t.planos)
    const dono = { usuarioId: USUARIO.id, perfil: "ANUNCIANTE" as const }
    expect((await preparar.executar(dono, { anuncioId, quantidade: 1 })).ok).toBe(false)
    const foto = (n: number) => ({ url: `https://res.cloudinary.com/x/image/upload/teste/anuncios/${anuncioId}/${n}`, publicId: `teste/anuncios/${anuncioId}/${n}` })
    expect((await adicionar.executar(dono, { anuncioId, fotos: [foto(1)] })).ok).toBe(false)
    expect((await adicionar.executar({ usuarioId: "admin", perfil: "ADMIN" }, { anuncioId, fotos: [foto(2), foto(3)] })).ok).toBe(true)
    const comFoto = await anuncioNoPlano(t, "FOTOS", 7)
    expect((await preparar.executar(dono, { anuncioId: comFoto.anuncioId, quantidade: 6 })).ok).toBe(true)
    expect((await preparar.executar(dono, { anuncioId: comFoto.anuncioId, quantidade: 7 })).ok).toBe(false)
  })
})

describe("Tabela de preços no painel (RF-51)", () => {
  it("o admin muda preço; código desconhecido é recusado", async () => {
    const t = montar(false)
    const atualizar = new AtualizarPlanoUseCase(t.planos)
    const simples = (await t.planos.buscar("SIMPLES"))!
    expect((await atualizar.executar("SIMPLES", { ...simples, precos: { ...simples.precos, 7: 150 } })).ok).toBe(true)
    expect((await t.planos.buscar("SIMPLES"))!.precos[7]).toBe(150)
    expect((await atualizar.executar("OURO", { ...simples })).ok).toBe(false)
  })
})

describe("Contato e localização (features 002 e 004)", () => {
  it("chamado recebe protocolo e há limite por e-mail por hora", async () => {
    const chamados = new ChamadosEmMemoria()
    const abrir = new AbrirChamadoUseCase(chamados, new CodigosEmSequencia(), new RelogioFixo())
    const pedido = { nome: "Ana Lima", email: "ana@exemplo.com", telefone: "", assunto: "DUVIDA", mensagem: "Como faço para anunciar?", anuncioCodigo: null }
    const r = await abrir.executar(pedido)
    expect(r.ok && r.valor.protocolo).toHaveLength(8)
    for (let i = 0; i < 4; i++) await abrir.executar(pedido)
    const sexto = await abrir.executar(pedido)
    expect(!sexto.ok && sexto.codigo).toBe("MUITOS_CHAMADOS")
  })
  it("coordenada fora do Brasil não vira cidade", () => {
    const localizar = new LocalizarCidadeUseCase(localidades)
    expect(localizar.executar({ latitude: -15.79, longitude: -47.88 }).ok).toBe(true)
    expect(localizar.executar({ latitude: 40.7, longitude: -74 }).ok).toBe(false)
  })
})

describe("Adaptador do Mercado Pago (ADR-12, ADR-14)", () => {
  it("só a ordem processed confirma (RN-84)", () => {
    expect(situacaoDoMercadoPago("processed")).toBe("APROVADO")
    expect(situacaoDoMercadoPago("action_required")).toBe("PENDENTE")
    expect(situacaoDoMercadoPago("processing")).toBe("PENDENTE")
    expect(situacaoDoMercadoPago("approved")).toBe("PENDENTE")
    for (const status of ["failed", "canceled", "refunded", "charged_back", "expired"]) expect(situacaoDoMercadoPago(status)).toBe("RECUSADO")
  })

  it("traduz valor e prazo do Pix (RN-83)", () => {
    expect(centavosDoMercadoPago("1.10")).toBe(110)
    expect(centavosDoMercadoPago("30.00")).toBe(3000)
    expect(reaisParaOMercadoPago(105)).toBe("1.05")
    expect(reaisParaOMercadoPago(25000)).toBe("250.00")
    const agora = new Date("2026-11-10T15:00:00Z")
    expect(duracaoAteVencer(new Date(agora.getTime() + DIA), agora)).toBe("P1D")
    expect(duracaoAteVencer(new Date(agora.getTime() + 90 * 60_000), agora)).toBe("PT1H30M")
    expect(duracaoAteVencer(new Date(agora.getTime() + 60_000), agora)).toBe("PT30M")
    expect(duracaoAteVencer(new Date(agora.getTime() + 60 * DIA), agora)).toBe("P30D")
  })

  it("cria a ordem Pix com idempotência e lê o código (RN-84)", async () => {
    const chamadas: Array<{ url: string; init: RequestInit }> = []
    const falso = (async (url: string, init: RequestInit) => {
      chamadas.push({ url, init })
      return new Response(
        JSON.stringify({ id: ORDEM, status: "action_required", total_amount: "30.00", external_reference: "ABCDEFGHJK", transactions: { payments: [{ payment_method: { id: "pix", type: "bank_transfer", qr_code: "000201pix" } }] } }),
        { status: 201 },
      )
    }) as unknown as typeof fetch
    const gw = new MercadoPagoGateway("token", falso)
    const vencimentoEm = new Date(Date.now() + DIA)
    const r = await gw.criarCobranca({ referencia: "ABCDEFGHJK", valorCentavos: 3000, descricao: "x", emailDoPagador: "a@b.com", vencimentoEm })
    expect(r).toEqual({ gatewayId: ORDEM, copiaECola: "000201pix", vencimentoEm })
    expect(chamadas[0].url).toBe("https://api.mercadopago.com/v1/orders")
    const corpo = JSON.parse(String(chamadas[0].init.body))
    expect(corpo).toMatchObject({
      type: "online",
      processing_mode: "automatic",
      total_amount: "30.00",
      external_reference: "ABCDEFGHJK",
      payer: { email: "a@b.com" },
      transactions: { payments: [{ amount: "30.00", payment_method: { id: "pix", type: "bank_transfer" }, expiration_time: "P1D" }] },
    })
    expect(corpo).not.toHaveProperty("notification_url")
    expect((chamadas[0].init.headers as Record<string, string>)["X-Idempotency-Key"]).toBe("ABCDEFGHJK")
  })

  it("sem código Pix na resposta, a cobrança falha e cai no Pix estático (RF-83)", async () => {
    const falso = (async () => new Response(JSON.stringify({ id: ORDEM, status: "action_required", total_amount: "1.00", external_reference: "A" }), { status: 201 })) as unknown as typeof fetch
    const gw = new MercadoPagoGateway("token", falso)
    await expect(gw.criarCobranca({ referencia: "A", valorCentavos: 100, descricao: "x", emailDoPagador: "a@b.com", vencimentoEm: new Date(Date.now() + DIA) })).rejects.toThrow("não devolveu o código Pix")
  })

  it("consulta a ordem e usa o valor efetivamente pago (RN-85)", async () => {
    const urls: string[] = []
    const responder = (ordem: object) =>
      (async (url: string) => {
        urls.push(url)
        return new Response(JSON.stringify(ordem), { status: 200 })
      }) as unknown as typeof fetch
    const paga = await new MercadoPagoGateway("token", responder({ id: ORDEM, status: "processed", total_amount: "30.00", total_paid_amount: "29.00", external_reference: "ABC" })).consultar(ORDEM)
    expect(paga).toEqual({ gatewayId: ORDEM, situacao: "APROVADO", valorCentavos: 2900, referencia: "ABC" })
    expect(urls[0]).toBe(`https://api.mercadopago.com/v1/orders/${ORDEM}`)
    const semValorPago = await new MercadoPagoGateway("token", responder({ id: ORDEM, status: "processed", total_amount: "30.00", external_reference: "ABC" })).consultar(ORDEM)
    expect(semValorPago.valorCentavos).toBe(3000)
  })

  it("só processa aviso de ordem com identificador válido (RN-86)", () => {
    expect(ehAvisoDeOrdem("order", ORDEM)).toBe(true)
    expect(ehAvisoDeOrdem("orders", ORDEM)).toBe(true)
    expect(ehAvisoDeOrdem("payment", ORDEM)).toBe(false)
    expect(ehAvisoDeOrdem("order", "123456")).toBe(false)
    expect(ehAvisoDeOrdem("order", "")).toBe(false)
    expect(ehAvisoDeOrdem("order", "ORD../users/me")).toBe(false)
  })

  it("confere a assinatura do webhook com o id da ordem em minúsculas (RN-82)", () => {
    const segredo = "segredo-teste"
    const ts = "1731100000"
    const v1 = createHmac("sha256", segredo).update(`id:${ORDEM.toLowerCase()};request-id:req-1;ts:${ts};`).digest("hex")
    expect(assinaturaDoMercadoPagoConfere({ segredo, assinatura: `ts=${ts},v1=${v1}`, requestId: "req-1", dataId: ORDEM })).toBe(true)
    expect(assinaturaDoMercadoPagoConfere({ segredo, assinatura: `ts=${ts},v1=${v1}`, requestId: "req-1", dataId: "ORD0" })).toBe(false)
    expect(assinaturaDoMercadoPagoConfere({ segredo, assinatura: null, requestId: "req-1", dataId: ORDEM })).toBe(false)
  })
})

describe("Ligação com o Mercado Pago (feature 006, T-84)", () => {
  it("ordem que o Mercado Pago não conhece vira erro próprio (o webhook responde 'recebido')", async () => {
    const falso = (async () => new Response("{}", { status: 404 })) as unknown as typeof fetch
    const gw = new MercadoPagoGateway("token", falso)
    await expect(gw.consultar(ORDEM)).rejects.toBeInstanceOf(PagamentoNaoEncontradoNoMercadoPago)
    await expect(gw.consultar("123")).rejects.toBeInstanceOf(PagamentoNaoEncontradoNoMercadoPago)
  })
  it("verifica a conta do token e diz se é de produção", async () => {
    const falso = (async () => new Response(JSON.stringify({ id: 42, nickname: "CLASSIFICADOS" }), { status: 200 })) as unknown as typeof fetch
    expect(await contaDoMercadoPago("APP_USR-123", falso)).toEqual({ id: 42, apelido: "CLASSIFICADOS", producao: true })
    expect((await contaDoMercadoPago("TEST-123", falso)).producao).toBe(false)
    const deTeste = (corpo: object) => (async () => new Response(JSON.stringify({ id: 7, ...corpo }), { status: 200 })) as unknown as typeof fetch
    expect((await contaDoMercadoPago("APP_USR-123", deTeste({ nickname: "x", tags: ["normal", "test_user"] }))).producao).toBe(false)
    expect((await contaDoMercadoPago("APP_USR-123", deTeste({ nickname: "TESTUSER1234" }))).producao).toBe(false)
    const recusa = (async () => new Response("{}", { status: 401 })) as unknown as typeof fetch
    await expect(contaDoMercadoPago("APP_USR-x", recusa)).rejects.toThrow("recusou o token")
  })
})
