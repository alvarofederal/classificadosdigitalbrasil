"use client"

import { Check, Copy } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

export function CopiarTexto({ texto, rotulo }: { texto: string; rotulo: string }) {
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      toast.success("Código copiado. Cole no app do banco.")
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      toast.error("Não foi possível copiar. Selecione o texto e copie manualmente.")
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea readOnly value={texto} className="campo min-h-20 break-all font-mono text-xs" aria-label="Código Pix copia e cola" onFocus={(e) => e.currentTarget.select()} />
      <button type="button" onClick={copiar} className="botao self-start">
        {copiado ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        {copiado ? "Copiado" : rotulo}
      </button>
    </div>
  )
}
