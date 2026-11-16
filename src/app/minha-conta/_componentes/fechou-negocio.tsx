"use client"

// APRESENTAÇÃO — "Fechou negócio?" na tela do anúncio (feature 021: RF-210, RF-212).

import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { RESULTADOS_DO_ANUNCIO, type ResultadoDoAnuncio, fechouNegocio } from "@/domain/anuncio/resultado"
import { cn } from "@/lib/utils"
import { registrarResultadoAction } from "../actions"
import { BotaoAtivarDesativar } from "./botoes-anuncio"

export function FechouNegocio({
  anuncioId,
  resultado,
  noAr,
  ate,
}: {
  anuncioId: string
  resultado: ResultadoDoAnuncio | null
  /** O anúncio ainda está no caderno: quem fechou negócio pode tirá-lo na hora (RF-212). */
  noAr: boolean
  ate: string
}) {
  const router = useRouter()
  const [pendente, iniciar] = useTransition()
  const [escolhendo, setEscolhendo] = useState<ResultadoDoAnuncio | null>(null)

  function responder(novo: ResultadoDoAnuncio) {
    setEscolhendo(novo)
    iniciar(async () => {
      const r = await registrarResultadoAction(anuncioId, novo)
      if (r && !r.ok) toast.error(r.mensagem ?? "Não foi possível guardar a resposta.")
      else {
        toast.success(r?.mensagem ?? "Resposta guardada.")
        router.refresh()
      }
      setEscolhendo(null)
    })
  }

  return (
    <section id="fechou-negocio" aria-labelledby="titulo-fechou-negocio" className="flex scroll-mt-4 flex-col gap-3 border border-fio p-4">
      <h2 id="titulo-fechou-negocio" className="font-titulo text-lg font-bold uppercase">
        Fechou negócio?
      </h2>
      <p className="text-sm">Conte pra gente se vendeu, alugou ou conseguiu o cliente. A resposta ajuda a melhorar o caderno e pode ser mudada depois.</p>
      <div role="radiogroup" aria-label="Fechou negócio?" className="flex flex-wrap gap-2">
        {(Object.keys(RESULTADOS_DO_ANUNCIO) as ResultadoDoAnuncio[]).map((chave) => {
          const marcado = resultado === chave
          return (
            <button
              key={chave}
              type="button"
              role="radio"
              aria-checked={marcado}
              disabled={pendente}
              onClick={() => responder(chave)}
              className={cn("botao botao-pequeno", !marcado && "botao-vazado")}
            >
              {pendente && escolhendo === chave && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {RESULTADOS_DO_ANUNCIO[chave]}
            </button>
          )
        })}
      </div>
      {/* RF-212: fechou negócio com o anúncio no ar? Tirar do caderno é uma escolha à parte (RN-212). */}
      {fechouNegocio(resultado) && noAr && (
        <div className="flex flex-wrap items-center gap-3 border-t border-fio pt-3 text-sm">
          <span>Para não receber mais mensagens, tire o anúncio do caderno.</span>
          <BotaoAtivarDesativar anuncioId={anuncioId} desativado={false} ate={ate} />
        </div>
      )}
    </section>
  )
}
