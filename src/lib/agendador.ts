// APRESENTAÇÃO — conferência do agendador da Vercel nas rotas de tarefa (feature 012: RN-123; ADR-17).

import { timingSafeEqual } from "node:crypto"

/**
 * RN-123: a Vercel chama a tarefa com `Authorization: Bearer <CRON_SECRET>`.
 * Sem segredo configurado, recusa sempre. A comparação leva o mesmo tempo acerte ou erre.
 */
export function autorizadoPeloAgendador(cabecalho: string | null, segredo: string | undefined): boolean {
  if (!segredo || segredo.trim() === "") return false
  const esperado = Buffer.from(`Bearer ${segredo}`)
  const recebido = Buffer.from(cabecalho ?? "")
  return recebido.length === esperado.length && timingSafeEqual(recebido, esperado)
}
