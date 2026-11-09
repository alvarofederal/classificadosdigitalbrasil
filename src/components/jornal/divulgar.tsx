"use client"

// APRESENTAÇÃO — botões para divulgar o anúncio em qualquer lugar (feature 005: boca a boca).

import { Check, Copy, Printer, Share2 } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { toast } from "sonner"

function abrir(url: string) {
  window.open(url, "_blank", "noopener,noreferrer")
}

/** `codigo`: quando é um anúncio, aparece também o botão do cartaz com QR Code. */
export function Divulgar({ titulo, link, codigo }: { titulo: string; link: string; codigo?: string }) {
  const [copiado, setCopiado] = useState(false)
  const [temCompartilhar, setTemCompartilhar] = useState(false)
  const texto = `${titulo} — veja no Classificados Digitais do Brasil: ${link}`

  useEffect(() => setTemCompartilhar(typeof navigator.share === "function"), [])

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link)
      setCopiado(true)
      toast.success("Link copiado.")
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      toast.error("Não foi possível copiar. Selecione o link e copie.")
    }
  }

  const botoes = [
    { rotulo: "WhatsApp", acao: () => abrir(`https://wa.me/?text=${encodeURIComponent(texto)}`) },
    { rotulo: "Facebook", acao: () => abrir(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`) },
    { rotulo: "Telegram", acao: () => abrir(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(titulo)}`) },
    { rotulo: "X", acao: () => abrir(`https://twitter.com/intent/tweet?text=${encodeURIComponent(texto)}`) },
  ]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-stretch gap-2">
        <input readOnly value={link} aria-label="Link do anúncio" className="campo min-w-0 flex-1 font-mono text-sm" onFocus={(e) => e.currentTarget.select()} />
        <button type="button" onClick={copiar} className="botao botao-pequeno shrink-0">
          {copiado ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copiado ? "Copiado" : "Copiar"}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {temCompartilhar && (
          <button type="button" className="botao botao-pequeno" onClick={() => navigator.share({ title: titulo, text: titulo, url: link }).catch(() => undefined)}>
            <Share2 className="size-4" aria-hidden />
            Compartilhar
          </button>
        )}
        {botoes.map((b) => (
          <button key={b.rotulo} type="button" onClick={b.acao} className="botao botao-vazado botao-pequeno">
            {b.rotulo}
          </button>
        ))}
        {codigo && (
        <Link href={`/cartaz/${codigo}`} target="_blank" className="botao botao-vazado botao-pequeno">
          <Printer className="size-4" aria-hidden />
          Cartaz com QR Code
        </Link>
        )}
      </div>
    </div>
  )
}
