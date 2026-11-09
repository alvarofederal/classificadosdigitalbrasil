"use client"

// APRESENTAÇÃO — acompanha o Pix sozinho e avisa quando cai (feature 006: RF-82).

import { CheckCircle2, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { verificarPagamentoAction } from "../actions"

const INTERVALO_MS = 5000
const LIMITE_MS = 30 * 60_000

export function AcompanharPagamento({ anuncioId }: { anuncioId: string }) {
  const router = useRouter()
  const [pago, setPago] = useState(false)
  const [parado, setParado] = useState(false)

  useEffect(() => {
    const inicio = Date.now()
    let ativo = true
    const relogio = setInterval(async () => {
      if (!ativo || document.hidden) return
      if (Date.now() - inicio > LIMITE_MS) {
        setParado(true)
        clearInterval(relogio)
        return
      }
      const r = await verificarPagamentoAction(anuncioId)
      if (r.pago && ativo) {
        setPago(true)
        clearInterval(relogio)
        setTimeout(() => router.refresh(), 1200)
      }
    }, INTERVALO_MS)
    return () => {
      ativo = false
      clearInterval(relogio)
    }
  }, [anuncioId, router])

  if (pago) {
    return (
      <p role="status" className="flex items-center gap-2 border-2 border-sucesso px-3 py-2 font-titulo font-bold uppercase text-sucesso">
        <CheckCircle2 className="size-5" aria-hidden />
        Pagamento confirmado. Seu anúncio está no caderno.
      </p>
    )
  }
  return (
    <p role="status" className="flex items-center gap-2 text-sm text-tinta-suave">
      {!parado && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {parado ? "Ainda não recebemos o Pix. Se já pagou, recarregue a página em instantes." : "Aguardando o pagamento… esta tela atualiza sozinha."}
    </p>
  )
}
