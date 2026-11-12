// APRESENTAÇÃO — rodada diária do aviso de vencimento (feature 012: RF-121, RN-123; ADR-17).
// O agendador da Vercel chama este endereço uma vez por dia (`crons` em vercel.json), com o CRON_SECRET no cabeçalho.

import { NextResponse } from "next/server"
import { container } from "@/infrastructure/container"
import { autorizadoPeloAgendador } from "@/lib/agendador"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(request: Request) {
  // RN-123: sem o segredo do agendador, ninguém dispara envio de e-mail por aqui.
  if (!autorizadoPeloAgendador(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
  try {
    const resumo = await container().avisarVencimentos.executar()
    console.log("[aviso de vencimento] rodada", JSON.stringify(resumo))
    return NextResponse.json({ ok: true, ...resumo })
  } catch (erro) {
    console.error("[aviso de vencimento] a rodada falhou", erro)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
