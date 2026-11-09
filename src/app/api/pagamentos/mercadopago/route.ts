// APRESENTAÇÃO — aviso do Mercado Pago quando um Pix muda de situação (feature 006: RF-81, RN-80 a RN-82).
// Configurar no Mercado Pago: Suas integrações → aplicação → Webhooks → URL deste endereço, evento "Pagamentos".

import { NextResponse } from "next/server"
import { container } from "@/infrastructure/container"
import { PagamentoNaoEncontradoNoMercadoPago, assinaturaDoMercadoPagoConfere } from "@/infrastructure/pagamentos/mercado-pago"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const url = new URL(request.url)
  const corpo = (await request.json().catch(() => ({}))) as { type?: string; action?: string; data?: { id?: string | number } }
  const dataId = String(url.searchParams.get("data.id") ?? corpo.data?.id ?? "")
  const tipo = url.searchParams.get("type") ?? corpo.type ?? ""

  // Avisos que não são de pagamento (ou sem id) são só confirmados para o Mercado Pago parar de reenviar.
  if (tipo !== "payment" || !/^\d{1,30}$/.test(dataId)) return NextResponse.json({ ok: true, ignorado: true })

  const segredo = process.env.MERCADO_PAGO_WEBHOOK_SECRET?.trim()
  if (segredo) {
    const confere = assinaturaDoMercadoPagoConfere({
      segredo,
      assinatura: request.headers.get("x-signature"),
      requestId: request.headers.get("x-request-id"),
      dataId,
    })
    if (!confere) {
      console.warn("[webhook mercadopago] assinatura inválida para o pagamento", dataId)
      return NextResponse.json({ ok: false }, { status: 401 })
    }
  }

  try {
    const resultado = await container().processarPagamentoDoGateway.executar(dataId)
    if (!resultado.ok) console.warn("[webhook mercadopago]", resultado.codigo, resultado.mensagem)
    else if (resultado.valor === "CONFIRMADO") console.log("[webhook mercadopago] pagamento confirmado", dataId)
    // Divergência (valor, referência) é registrada e não volta a ser reenviada; a cobrança fica pendente para o admin olhar.
    return NextResponse.json({ ok: true })
  } catch (erro) {
    // Pagamento que o Mercado Pago não conhece (ex.: "Simular notificação" no painel dele): recebido, nada a fazer.
    if (erro instanceof PagamentoNaoEncontradoNoMercadoPago) return NextResponse.json({ ok: true, ignorado: true })
    // Falha temporária (API ou banco fora): 500 faz o Mercado Pago tentar de novo mais tarde.
    console.error("[webhook mercadopago] falha ao processar", dataId, erro)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
