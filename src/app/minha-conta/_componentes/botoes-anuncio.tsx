"use client"

// APRESENTAÇÃO — renovar e remover o anúncio.

import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"
import { removerAnuncioAction, renovarAnuncioAction } from "../actions"

export function BotaoRenovar({ anuncioId, rotulo }: { anuncioId: string; rotulo: string }) {
  const router = useRouter()
  const [pendente, iniciar] = useTransition()
  return (
    <button
      type="button"
      className="botao"
      disabled={pendente}
      onClick={() =>
        iniciar(async () => {
          const r = await renovarAnuncioAction(anuncioId)
          if (r && !r.ok) toast.error(r.mensagem)
          else {
            toast.success(r?.mensagem ?? "Cobrança gerada.")
            router.refresh()
          }
        })
      }
    >
      {pendente && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {rotulo}
    </button>
  )
}

export function BotaoRemover({ anuncioId }: { anuncioId: string }) {
  const [pendente, iniciar] = useTransition()
  return (
    <button
      type="button"
      className="botao botao-vazado botao-pequeno border-perigo text-perigo"
      disabled={pendente}
      onClick={() => {
        if (!window.confirm("Remover este anúncio do caderno? Ele sai do ar na hora e o tempo pago restante é perdido.")) return
        iniciar(async () => {
          const r = await removerAnuncioAction(anuncioId)
          if (r && !r.ok) toast.error(r.mensagem)
        })
      }}
    >
      {pendente && <Loader2 className="size-4 animate-spin" aria-hidden />}
      Remover anúncio
    </button>
  )
}
