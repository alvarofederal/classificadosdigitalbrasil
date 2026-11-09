"use client"

import { Printer } from "lucide-react"

export function BotaoImprimir() {
  return (
    <button type="button" onClick={() => window.print()} className="botao botao-pequeno shrink-0">
      <Printer className="size-4" aria-hidden />
      Imprimir cartaz
    </button>
  )
}
