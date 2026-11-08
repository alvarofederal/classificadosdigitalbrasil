// APRESENTAÇÃO — selo da situação do anúncio (aguardando pagamento, no ar, expirado, removido).

import { SITUACOES_EXIBIDAS, type SituacaoExibida } from "@/domain/anuncio/anuncio"
import { cn } from "@/lib/utils"

const ESTILO: Record<SituacaoExibida, string> = {
  AGUARDANDO_PAGAMENTO: "border-tinta bg-papel-escuro",
  NO_AR: "border-sucesso bg-sucesso text-white",
  EXPIRADO: "border-tinta-suave text-tinta-suave",
  REMOVIDO: "border-perigo text-perigo",
}

export function SeloSituacao({ situacao, className }: { situacao: SituacaoExibida; className?: string }) {
  return (
    <span className={cn("inline-flex items-center border px-2 py-0.5 font-titulo text-xs font-semibold uppercase tracking-wide", ESTILO[situacao], className)}>
      {SITUACOES_EXIBIDAS[situacao]}
    </span>
  )
}
