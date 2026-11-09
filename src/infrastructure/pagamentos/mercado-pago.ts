// INFRAESTRUTURA — adaptador do Mercado Pago para o Pix automático (feature 006, ADR-12 e ADR-14).
// Documentação: POST /v1/orders (Pix em transactions.payments[].payment_method) e GET /v1/orders/{id}.

import { createHmac, timingSafeEqual } from "crypto"
import type { CobrancaNoGateway, GatewayPix, PagamentoNoGateway, SituacaoNoGateway } from "@/application/ports/caderno"

const API = "https://api.mercadopago.com"

type Buscar = typeof fetch

/** Identificador de ordem: "ORD" seguido de letras e números. */
const ID_DE_ORDEM = /^ORD[0-9A-Z]{1,60}$/i

/** O Mercado Pago aceita vencimento entre 30 minutos e 30 dias. */
const VENCIMENTO_MINIMO_EM_MINUTOS = 30
const VENCIMENTO_MAXIMO_EM_MINUTOS = 30 * 24 * 60

/** Resposta do Mercado Pago, só com o que usamos. */
interface OrdemMP {
  id: string
  status: string
  total_amount: string
  total_paid_amount?: string | null
  external_reference: string | null
  transactions?: { payments?: Array<{ payment_method?: { qr_code?: string } }> }
}

/** RN-84: "processed" → APROVADO; recusada, cancelada, estornada ou vencida → RECUSADO; o resto ainda está pendente. */
export function situacaoDoMercadoPago(status: string): SituacaoNoGateway {
  if (status === "processed") return "APROVADO"
  if (["failed", "canceled", "refunded", "charged_back", "expired"].includes(status)) return "RECUSADO"
  return "PENDENTE"
}

/** "50.00" → centavos inteiros, sem erro de ponto flutuante. */
export function centavosDoMercadoPago(valor: string): number {
  return Math.round(Number(valor) * 100)
}

/** Centavos inteiros → "50.00", formato de valor da API de Orders. */
export function reaisParaOMercadoPago(centavos: number): string {
  return `${Math.floor(centavos / 100)}.${String(centavos % 100).padStart(2, "0")}`
}

/** Prazo até o vencimento em duração ISO 8601 ("P1D", "PT1H30M"), dentro do limite do Mercado Pago. */
export function duracaoAteVencer(vencimentoEm: Date, agora: Date): string {
  const faltam = Math.ceil((vencimentoEm.getTime() - agora.getTime()) / 60_000)
  const total = Math.min(Math.max(faltam, VENCIMENTO_MINIMO_EM_MINUTOS), VENCIMENTO_MAXIMO_EM_MINUTOS)
  const dias = Math.floor(total / 1440)
  const horas = Math.floor((total % 1440) / 60)
  const minutos = total % 60
  const tempo = `${horas ? `${horas}H` : ""}${minutos ? `${minutos}M` : ""}`
  return `P${dias ? `${dias}D` : ""}${tempo ? `T${tempo}` : ""}`
}

/** RN-86: só interessa aviso de ordem com identificador válido. A documentação chama o tópico de "order" e de "orders". */
export function ehAvisoDeOrdem(tipo: string, dataId: string): boolean {
  return (tipo === "order" || tipo === "orders") && ID_DE_ORDEM.test(dataId)
}

/** O Mercado Pago não conhece esta ordem (por exemplo, o botão "Simular notificação" do painel dele). */
export class PagamentoNaoEncontradoNoMercadoPago extends Error {}

export interface ContaDoMercadoPago {
  id: number
  apelido: string
  /** Falso para token TEST- e para conta de teste: em aplicação de Orders, o token de teste também começa com APP_USR-. */
  producao: boolean
}

export class MercadoPagoGateway implements GatewayPix {
  readonly nome = "MERCADO_PAGO" as const

  constructor(
    private readonly accessToken: string,
    private readonly buscar: Buscar = fetch,
  ) {}

  async criarCobranca(params: { referencia: string; valorCentavos: number; descricao: string; emailDoPagador: string; vencimentoEm: Date }): Promise<CobrancaNoGateway> {
    const valor = reaisParaOMercadoPago(params.valorCentavos)
    const resposta = await this.buscar(`${API}/v1/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        // A mesma cobrança nunca vira dois Pix no Mercado Pago, mesmo com nova tentativa.
        "X-Idempotency-Key": params.referencia,
      },
      body: JSON.stringify({
        type: "online",
        processing_mode: "automatic",
        total_amount: valor,
        description: params.descricao,
        external_reference: params.referencia,
        payer: { email: params.emailDoPagador },
        transactions: {
          payments: [
            {
              amount: valor,
              payment_method: { id: "pix", type: "bank_transfer" },
              expiration_time: duracaoAteVencer(params.vencimentoEm, new Date()),
            },
          ],
        },
      }),
    })
    if (!resposta.ok) throw new Error(`Mercado Pago recusou a cobrança (${resposta.status}): ${(await resposta.text()).slice(0, 300)}`)
    const ordem = (await resposta.json()) as OrdemMP
    const copiaECola = ordem.transactions?.payments?.[0]?.payment_method?.qr_code
    if (!copiaECola) throw new Error("Mercado Pago não devolveu o código Pix.")
    // A resposta da ordem não traz a data de vencimento: vale a que pedimos.
    return { gatewayId: ordem.id, copiaECola, vencimentoEm: params.vencimentoEm }
  }

  async consultar(gatewayId: string): Promise<PagamentoNoGateway> {
    if (!ID_DE_ORDEM.test(gatewayId)) throw new PagamentoNaoEncontradoNoMercadoPago(`${gatewayId} não é o identificador de uma ordem.`)
    const resposta = await this.buscar(`${API}/v1/orders/${gatewayId}`, { headers: { Authorization: `Bearer ${this.accessToken}` }, cache: "no-store" })
    if (resposta.status === 400 || resposta.status === 404) throw new PagamentoNaoEncontradoNoMercadoPago(`Ordem ${gatewayId} não existe no Mercado Pago.`)
    if (!resposta.ok) throw new Error(`Mercado Pago não respondeu a consulta da ordem ${gatewayId} (${resposta.status}).`)
    const ordem = (await resposta.json()) as OrdemMP
    return {
      gatewayId: ordem.id,
      situacao: situacaoDoMercadoPago(ordem.status),
      valorCentavos: centavosDoMercadoPago(ordem.total_paid_amount ?? ordem.total_amount),
      referencia: ordem.external_reference,
    }
  }
}

/** Painel → Configurações: confere se o token funciona e de qual conta é (GET /users/me). */
export async function contaDoMercadoPago(accessToken: string, buscar: Buscar = fetch): Promise<ContaDoMercadoPago> {
  const resposta = await buscar(`${API}/users/me`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" })
  if (!resposta.ok) throw new Error(`O Mercado Pago recusou o token (${resposta.status}).`)
  const conta = (await resposta.json()) as { id: number; nickname?: string; tags?: string[] }
  const contaDeTeste = (conta.tags ?? []).includes("test_user") || /^TESTUSER/i.test(conta.nickname ?? "")
  return { id: conta.id, apelido: conta.nickname ?? String(conta.id), producao: accessToken.startsWith("APP_USR-") && !contaDeTeste }
}

/**
 * RN-82: confere a assinatura do aviso. O Mercado Pago manda `x-signature: ts=…,v1=…` e `x-request-id`;
 * v1 é o HMAC-SHA256 de `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` com a chave secreta do webhook.
 * O id de ordem tem letras maiúsculas e entra no cálculo em minúsculas.
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
