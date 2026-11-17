// APRESENTAÇÃO — rodada diária dos vencidos (feature 018: RF-182, RF-183, RN-123; ADR-24).
// O agendador da Vercel chama este endereço uma vez por dia (`crons` em vercel.json), com o CRON_SECRET no cabeçalho.

import { NextResponse } from "next/server"
import { container } from "@/infrastructure/container"
import { autorizadoPeloAgendador } from "@/lib/agendador"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/** Roda uma parte da rodada; a falha fica no log e não impede a parte seguinte. */
async function parte<T>(nome: string, tarefa: () => Promise<T>): Promise<T | null> {
  try {
    return await tarefa()
  } catch (erro) {
    console.error(`[vencidos] ${nome} falhou`, erro)
    return null
  }
}

export async function GET(request: Request) {
  // RN-123: sem o segredo do agendador, ninguém apaga nada por aqui.
  if (!autorizadoPeloAgendador(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
  const c = container()
  // ADR-24: primeiro apaga (mensagens, depois anúncios), depois avisa quem é apagado nos próximos 7 dias.
  const limpeza = await parte("a limpeza", () => c.apagarVencidos.executar())
  const avisos = await parte("o aviso de apagar", () => c.avisarAntesDeApagar.executar())
  const resposta = { ok: limpeza !== null && avisos !== null, limpeza, avisos }
  console.log("[vencidos] rodada", JSON.stringify(resposta))
  return NextResponse.json(resposta, { status: resposta.ok ? 200 : 500 })
}
