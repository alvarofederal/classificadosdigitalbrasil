"use client"

// APRESENTAÇÃO — renovar (escolhendo plano e período), ativar e desativar (feature 014) e remover o anúncio.

import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import type { Periodo, Plano } from "@/domain/plano/plano"
import { ativarAnuncioAction, desativarAnuncioAction, removerAnuncioAction, renovarAnuncioAction } from "../actions"
import { EscolhaDePlano } from "./escolha-de-plano"

export function RenovarComPlano({ anuncioId, planos, planoAtual, rotulo }: { anuncioId: string; planos: Plano[]; planoAtual: string; rotulo: string }) {
  const router = useRouter()
  const [pendente, iniciar] = useTransition()
  const [plano, setPlano] = useState(planos.some((p) => p.codigo === planoAtual) ? planoAtual : (planos[0]?.codigo ?? "SIMPLES"))
  const [dias, setDias] = useState<Periodo>(7)

  function gerar() {
    const dados = new FormData()
    dados.set("planoCodigo", plano)
    dados.set("dias", String(dias))
    iniciar(async () => {
      const r = await renovarAnuncioAction(anuncioId, dados)
      if (r && !r.ok) toast.error(r.mensagem ?? "Não foi possível gerar a cobrança.")
      else {
        toast.success(r?.mensagem ?? "Cobrança gerada.")
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <EscolhaDePlano planos={planos} plano={plano} dias={dias} aoMudarPlano={setPlano} aoMudarDias={setDias} />
      <button type="button" className="botao self-start" disabled={pendente} onClick={gerar}>
        {pendente && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {rotulo}
      </button>
    </div>
  )
}

/** Feature 014 (RF-140): no ar → Desativar; desativado com prazo → Ativar. O prazo não para (RN-141). */
export function BotaoAtivarDesativar({ anuncioId, desativado, ate }: { anuncioId: string; desativado: boolean; ate: string }) {
  const router = useRouter()
  const [pendente, iniciar] = useTransition()
  return (
    <button
      type="button"
      className={desativado ? "botao botao-pequeno" : "botao botao-vazado botao-pequeno"}
      disabled={pendente}
      onClick={() => {
        if (!desativado && !window.confirm(`Desativar este anúncio? Ele sai do caderno até você ativar de novo. O prazo continua correndo até ${ate}.`)) return
        iniciar(async () => {
          const r = desativado ? await ativarAnuncioAction(anuncioId) : await desativarAnuncioAction(anuncioId)
          if (r && !r.ok) toast.error(r.mensagem ?? "Não foi possível mudar a situação do anúncio.")
          else {
            toast.success(r?.mensagem ?? (desativado ? "Anúncio ativado." : "Anúncio desativado."))
            router.refresh()
          }
        })
      }}
    >
      {pendente && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {desativado ? "Ativar anúncio" : "Desativar anúncio"}
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
