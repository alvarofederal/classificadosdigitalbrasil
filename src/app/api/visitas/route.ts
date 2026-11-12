// APRESENTAÇÃO — aviso de visita mandado pelo navegador na página do anúncio (feature 013: RF-130, RN-130; ADR-18).
// Responde sempre 204 e nunca quebra a página: contar a visita é secundário a mostrar o anúncio.

import { headers } from "next/headers"
import { container } from "@/infrastructure/container"
import { usuarioAtual } from "@/lib/sessao"
import { dadosDaConexao, vemDoProprioSite } from "@/lib/visitas"

export const dynamic = "force-dynamic"

const SEM_CONTEUDO = () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } })

export async function POST(request: Request) {
  try {
    const cabecalhos = await headers()
    if (!vemDoProprioSite(cabecalhos)) return SEM_CONTEUDO()
    const corpo: unknown = await request.json().catch(() => null)
    const codigo = corpo && typeof corpo === "object" && "codigo" in corpo && typeof corpo.codigo === "string" ? corpo.codigo.slice(0, 12) : ""
    if (!codigo) return SEM_CONTEUDO()
    const usuario = await usuarioAtual()
    await container().registrarVisita.executar({
      codigo,
      ...dadosDaConexao(cabecalhos),
      quemVe: usuario ? { id: usuario.id, perfil: usuario.perfil } : null,
    })
  } catch (erro) {
    console.error("[visitas] falha ao registrar a visita", erro instanceof Error ? erro.message : erro)
  }
  return SEM_CONTEUDO()
}
