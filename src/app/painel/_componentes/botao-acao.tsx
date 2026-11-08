"use client"

// APRESENTAÇÃO — botão de uma ação do painel (confirmar pagamento, remover, restaurar, excluir).

import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"
import type { EstadoFormulario } from "@/lib/formularios"
import { cn } from "@/lib/utils"

export function BotaoAcao({
  acao,
  rotulo,
  confirmacao,
  perigo,
  vazado,
}: {
  acao: () => Promise<EstadoFormulario>
  rotulo: string
  confirmacao?: string
  perigo?: boolean
  vazado?: boolean
}) {
  const router = useRouter()
  const [pendente, iniciar] = useTransition()
  return (
    <button
      type="button"
      disabled={pendente}
      className={cn("botao botao-pequeno whitespace-nowrap", vazado && "botao-vazado", perigo && (vazado ? "border-perigo text-perigo" : "botao-perigo"))}
      onClick={() => {
        if (confirmacao && !window.confirm(confirmacao)) return
        iniciar(async () => {
          const r = await acao()
          if (r && !r.ok) toast.error(r.mensagem)
          else {
            if (r?.mensagem) toast.success(r.mensagem)
            router.refresh()
          }
        })
      }}
    >
      {pendente && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
      {rotulo}
    </button>
  )
}
