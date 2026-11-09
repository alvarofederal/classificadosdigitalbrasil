// INFRAESTRUTURA — adaptador do Mercado Pago para o Pix automático (feature 006, ADR-12).
// Documentação: POST /v1/payments (payment_method_id = "pix") e GET /v1/payments/{id}.

import { createHmac, timingSafeEqual } from "crypto"
import type { CobrancaNoGateway, GatewayPix, PagamentoNoGateway, SituacaoNoGateway } from "@/application/ports/caderno"

const API = "https://api.mercadopago.com"

type Buscar = typeof fetch

/** Resposta do Mercado Pago, só com o que usamos. */
interface PagamentoMP {
  id: number | string
  status: string
  transaction_amount: number
  external_reference: string | null
  date_of_expiration?: string | null
  point_of_interaction?: { transaction_data?: { qr_code?: string } }
}

/** "approved" → APROVADO; recusado, cancelado, estornado ou vencido → RECUSADO; o resto ainda está pendente. */
export function situacaoDoMercadoPago(status: string): SituacaoNoGateway {
  if (status === "approved") return "APROVADO"
  if (["rejected", "cancelled", "refunded", "charged_back"].includes(status)) return "RECUSADO"
  return "PENDENTE"
}

/** Reais com até 2 casas → centavos inteiros, sem erro de ponto flutuante. */
export function centavosDoMercadoPago(valor: number): number {
  return Math.round(valor * 100)
}

/** "2026-11-10T13:00:00.000-03:00", formato que o Mercado Pago aceita em date_of_expiration. */
export function dataNoFormatoDoMercadoPago(instante: Date): string {
  const brasilia = new Date(instante.getTime() - 3 * 3_600_000)
  return `${brasilia.toISOString().slice(0, 23)}-03:00`
}

export class MercadoPagoGateway implements GatewayPix {
  readonly nome = "MERCADO_PAGO" as const

  constructor(
    private readonly accessToken: string,
    private readonly urlDeNotificacao: string | null,
    private readonly buscar: Buscar = fetch,
  ) {}

  async criarCobranca(params: { referencia: string; valorCentavos: number; descricao: string; emailDoPagador: string; vencimentoEm: Date }): Promise<CobrancaNoGateway> {
    const resposta = await this.buscar(`${API}/v1/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        // A mesma cobrança nunca vira dois Pix no Mercado Pago, mesmo com nova tentativa.
        "X-Idempotency-Key": params.referencia,
      },
      body: JSON.stringify({
        transaction_amount: params.valorCentavos / 100,
        description: params.descricao,
        payment_method_id: "pix",
        external_reference: params.referencia,
        date_of_expiration: dataNoFormatoDoMercadoPago(params.vencimentoEm),
        payer: { email: params.emailDoPagador },
        ...(this.urlDeNotificacao ? { notification_url: this.urlDeNotificacao } : {}),
      }),
    })
    if (!resposta.ok) throw new Error(`Mercado Pago recusou a cobrança (${resposta.status}): ${(await resposta.text()).slice(0, 300)}`)
    const pagamento = (await resposta.json()) as PagamentoMP
    const copiaECola = pagamento.point_of_interaction?.transaction_data?.qr_code
    if (!copiaECola) throw new Error("Mercado Pago não devolveu o código Pix.")
    return {
      gatewayId: String(pagamento.id),
      copiaECola,
      vencimentoEm: pagamento.date_of_expiration ? new Date(pagamento.date_of_expiration) : params.vencimentoEm,
    }
  }

  async consultar(gatewayId: string): Promise<PagamentoNoGateway> {
    if (!/^\d{1,30}$/.test(gatewayId)) throw new Error("Identificador de pagamento inválido.")
    const resposta = await this.buscar(`${API}/v1/payments/${gatewayId}`, { headers: { Authorization: `Bearer ${this.accessToken}` }, cache: "no-store" })
    if (!resposta.ok) throw new Error(`Mercado Pago não encontrou o pagamento ${gatewayId} (${resposta.status}).`)
    const pagamento = (await resposta.json()) as PagamentoMP
    return {
      gatewayId: String(pagamento.id),
      situacao: situacaoDoMercadoPago(pagamento.status),
      valorCentavos: centavosDoMercadoPago(pagamento.transaction_amount),
      referencia: pagamento.external_reference,
    }
  }
}

/**
 * RN-82: confere a assinatura do aviso. O Mercado Pago manda `x-signature: ts=…,v1=…` e `x-request-id`;
 * v1 é o HMAC-SHA256 de `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` com a chave secreta do webhook.
 */
export function assinaturaDoMercadoPagoConfere(params: { segredo: string; assinatura: string | null; requestId: string | null; dataId: string }): boolean {
  if (!params.assinatura) return false
  const partes = Object.fromEntries(params.assinatura.split(",").map((p) => p.split("=").map((s) => s.trim()) as [string, string]))
  const ts = partes.ts
  const v1 = partes.v1
  if (!ts || !v1) return false
  const id = /^[a-z0-9]+$/i.test(params.dataId) ? params.dataId.toLowerCase() : params.dataId
  const manifesto = `id:${id};${params.requestId ? `request-id:${params.requestId};` : ""}ts:${ts};`
  const esperado = createHmac("sha256", params.segredo).update(manifesto).digest("hex")
  const a = Buffer.from(esperado)
  const b = Buffer.from(v1)
  return a.length === b.length && timingSafeEqual(a, b)
}
