// Feature 006 (Pix automático), 003 (planos), 004 (chamados) e 007 (cortesia) nos casos de uso.
import { createHmac } from "crypto"
import { describe, expect, it } from "vitest"
import { AbrirChamadoUseCase, LocalizarCidadeUseCase } from "@/application/use-cases/publico/publico"
import { AtualizarPlanoUseCase } from "@/application/use-cases/admin/administracao"
import { CriarAnuncioUseCase } from "@/application/use-cases/anuncios/gerenciar-anuncios"
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
  assinaturaDoMercadoPagoConfere,
  centavosDoMercadoPago,
  dataNoFormatoDoMercadoPago,
  situacaoDoMercadoPago,
} from "@/infrastructure/pagamentos/mercado-pago"
import { ChamadosEmMemoria, CodigosEmSequencia, RelogioFixo, caderno, localidades, storageFalso } from "../fakes"

const DIA = 86_400_000
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
    cortesia: new PublicarCortesiaUseCase(c.anuncios, { pagamentos: c.pagamentos, planos: c.planos, codigos: c.codigos, relogio: c.relogio }, confirmar),
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
  it("Vitrine 30 dias custa R$ 30,00 e o Pix vem do gateway", async () => {
    const t = montar()
    const { pendente } = await anuncioNoPlano(t, "VITRINE", 30)
    expect(pendente).toMatchObject({ planoCodigo: "VITRINE", dias: 30, valorCentavos: 3000, gateway: "MERCADO_PAGO" })
    expect(pendente.copiaECola).toContain(pendente.codigo)
    expect(t.gateway!.cobrancas).toHaveLength(1)
    expect((await t.cobranca.executar(pendente)).automatico).toBe(true)
  })

  it("recusa período fora de 7/30 e plano fora de venda", async () => {
    const t = montar()
    t.planos.itens = t.planos.itens.map((p) => (p.codigo === "DESTAQUE" ? { ...p, ativo: false } : p))
    const r = await t.criar.executar(USUARIO, { ...conteudo, planoCodigo: "DESTAQUE", dias: 15 })
    expect(!r.ok && Object.keys(r.campos ?? {}).sort()).toEqual(["dias", "planoCodigo"])
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
    const r = await t.renovar.executar({ usuarioId: USUARIO.id, email: USUARIO.email, anuncioId, planoCodigo: "DESTAQUE", dias: 30 })
    expect(r.ok && r.valor.valorCentavos).toBe(1500)
    expect((await t.pagamentos.buscarPorId(pendente.id))!.situacao).toBe("CANCELADO")
  })
})

describe("Webhook e confirmação automática (RN-80, RN-81)", () => {
  it("Pix aprovado publica no plano pago, com prioridade de Vitrine", async () => {
    const t = montar()
    const { anuncioId, pendente } = await anuncioNoPlano(t, "VITRINE", 30)
    t.gateway!.pagar(pendente.gatewayId!)
    const r = await t.processar.executar(pendente.gatewayId!)
    expect(r.ok && r.valor).toBe("CONFIRMADO")
    const anuncio = (await t.anuncios.buscarPorId(anuncioId))!
    expect(anuncio).toMatchObject({ situacao: "PUBLICADO", planoCodigo: "VITRINE", prioridade: 3 })
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
    const { anuncioId, pendente } = await anuncioNoPlano(t, "VITRINE", 30)
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
  it("Simples aceita 1 foto; o admin sobe até 6", async () => {
    const t = montar(false)
    const { anuncioId } = await anuncioNoPlano(t, "SIMPLES", 7)
    const preparar = new PrepararUploadDeFotosUseCase(t.anuncios, t.fotos, storageFalso, t.planos)
    const adicionar = new AdicionarFotosUseCase(t.anuncios, t.fotos, storageFalso, t.planos)
    const dono = { usuarioId: USUARIO.id, perfil: "ANUNCIANTE" as const }
    expect((await preparar.executar(dono, { anuncioId, quantidade: 2 })).ok).toBe(false)
    expect((await preparar.executar(dono, { anuncioId, quantidade: 1 })).ok).toBe(true)
    const foto = (n: number) => ({ url: `https://res.cloudinary.com/x/image/upload/teste/anuncios/${anuncioId}/${n}`, publicId: `teste/anuncios/${anuncioId}/${n}` })
    expect((await adicionar.executar(dono, { anuncioId, fotos: [foto(1)] })).ok).toBe(true)
    expect((await adicionar.executar(dono, { anuncioId, fotos: [foto(2)] })).ok).toBe(false)
    expect((await adicionar.executar({ usuarioId: "admin", perfil: "ADMIN" }, { anuncioId, fotos: [foto(2), foto(3)] })).ok).toBe(true)
  })
})

describe("Tabela de preços no painel (RF-51)", () => {
  it("o admin muda preço; código desconhecido é recusado", async () => {
    const t = montar(false)
    const atualizar = new AtualizarPlanoUseCase(t.planos)
    const simples = (await t.planos.buscar("SIMPLES"))!
    expect((await atualizar.executar("SIMPLES", { ...simples, valor7DiasCentavos: 150 })).ok).toBe(true)
    expect((await t.planos.buscar("SIMPLES"))!.valor7DiasCentavos).toBe(150)
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

describe("Adaptador do Mercado Pago (ADR-12)", () => {
  it("traduz situação, valor e data", () => {
    expect(situacaoDoMercadoPago("approved")).toBe("APROVADO")
    expect(situacaoDoMercadoPago("pending")).toBe("PENDENTE")
    expect(situacaoDoMercadoPago("rejected")).toBe("RECUSADO")
    expect(centavosDoMercadoPago(1.1)).toBe(110)
    expect(centavosDoMercadoPago(30)).toBe(3000)
    expect(dataNoFormatoDoMercadoPago(new Date("2026-11-10T15:00:00Z"))).toBe("2026-11-10T12:00:00.000-03:00")
  })

  it("monta a cobrança com idempotência e lê o código Pix", async () => {
    const chamadas: Array<{ url: string; init: RequestInit }> = []
    const falso = (async (url: string, init: RequestInit) => {
      chamadas.push({ url, init })
      return new Response(JSON.stringify({ id: 123, status: "pending", transaction_amount: 30, external_reference: "ABCDEFGHJK", point_of_interaction: { transaction_data: { qr_code: "000201pix" } } }), { status: 201 })
    }) as unknown as typeof fetch
    const gw = new MercadoPagoGateway("token", "https://site/api/pagamentos/mercadopago", falso)
    const r = await gw.criarCobranca({ referencia: "ABCDEFGHJK", valorCentavos: 3000, descricao: "x", emailDoPagador: "a@b.com", vencimentoEm: new Date("2026-11-10T15:00:00Z") })
    expect(r).toMatchObject({ gatewayId: "123", copiaECola: "000201pix" })
    const corpo = JSON.parse(String(chamadas[0].init.body))
    expect(corpo).toMatchObject({ transaction_amount: 30, payment_method_id: "pix", external_reference: "ABCDEFGHJK", notification_url: "https://site/api/pagamentos/mercadopago" })
    expect((chamadas[0].init.headers as Record<string, string>)["X-Idempotency-Key"]).toBe("ABCDEFGHJK")
  })

  it("confere a assinatura do webhook (RN-82)", () => {
    const segredo = "segredo-teste"
    const ts = "1731100000"
    const v1 = createHmac("sha256", segredo).update(`id:123;request-id:req-1;ts:${ts};`).digest("hex")
    expect(assinaturaDoMercadoPagoConfere({ segredo, assinatura: `ts=${ts},v1=${v1}`, requestId: "req-1", dataId: "123" })).toBe(true)
    expect(assinaturaDoMercadoPagoConfere({ segredo, assinatura: `ts=${ts},v1=${v1}`, requestId: "req-1", dataId: "124" })).toBe(false)
    expect(assinaturaDoMercadoPagoConfere({ segredo, assinatura: null, requestId: "req-1", dataId: "123" })).toBe(false)
  })
})
