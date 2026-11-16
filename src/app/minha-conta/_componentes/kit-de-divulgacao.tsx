"use client"

// APRESENTAÇÃO — kit de divulgação do anúncio no ar (feature 020: RF-200 a RF-204).
// Imagem para o status do WhatsApp, imagem quadrada para grupos, texto pronto, WhatsApp e cartaz.

import { Check, Copy, Download, Printer, Share2 } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { nomeDoArquivoDaImagem } from "@/domain/anuncio/divulgacao"

type Formato = "status" | "quadrado" | "qrcode"

export function KitDeDivulgacao({ codigo, texto }: { codigo: string; texto: string }) {
  const [podeCompartilharArquivo, setPodeCompartilharArquivo] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [enviando, setEnviando] = useState<Formato | null>(null)
  const imagens: Array<{ formato: Formato; rotulo: string; dica: string; url: string }> = [
    { formato: "status", rotulo: "Imagem para o status", dica: "Vertical, do tamanho da tela do celular.", url: `/imagem/${codigo}/status.png` },
    { formato: "quadrado", rotulo: "Imagem para grupos e redes", dica: "Quadrada, para grupos, Facebook e Instagram.", url: `/imagem/${codigo}/quadrado.png` },
    // Feature 022 (RF-223): o QR Code sozinho, para panfleto, cardápio, cartão ou adesivo.
    { formato: "qrcode", rotulo: "QR Code do anúncio", dica: "Para pôr no seu panfleto, cartão ou adesivo: a câmera do celular abre o anúncio.", url: `/imagem/${codigo}/qrcode.png` },
  ]

  // RF-203: só oferece "compartilhar com a imagem" no aparelho que aceita arquivo no compartilhar.
  useEffect(() => {
    try {
      const teste = new File([new Blob(["x"], { type: "image/png" })], "teste.png", { type: "image/png" })
      setPodeCompartilharArquivo(typeof navigator.canShare === "function" && navigator.canShare({ files: [teste] }))
    } catch {
      setPodeCompartilharArquivo(false)
    }
  }, [])

  async function copiarTexto(aviso = true) {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      if (aviso) toast.success("Texto copiado.")
      setTimeout(() => setCopiado(false), 2500)
      return true
    } catch {
      if (aviso) toast.error("Não foi possível copiar. Selecione o texto e copie.")
      return false
    }
  }

  async function compartilhar(formato: Formato, url: string) {
    setEnviando(formato)
    try {
      const resposta = await fetch(url)
      if (!resposta.ok) throw new Error(String(resposta.status))
      const arquivo = new File([await resposta.blob()], nomeDoArquivoDaImagem(codigo, formato), { type: "image/png" })
      // Alguns aplicativos descartam o texto que vai junto com a imagem: ele já fica copiado para colar.
      await copiarTexto(false)
      await navigator.share({ files: [arquivo], text: texto })
    } catch (erro) {
      if ((erro as Error)?.name !== "AbortError") toast.error("Não foi possível compartilhar. Baixe a imagem e copie o texto.")
    } finally {
      setEnviando(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {imagens.map((imagem) => (
          <figure key={imagem.formato} className="flex flex-col gap-2 border border-fio p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagem.url}
              alt={`${imagem.rotulo} do anúncio`}
              loading="lazy"
              className={
                imagem.formato === "status"
                  ? "mx-auto h-72 w-auto border border-tinta"
                  : imagem.formato === "qrcode"
                    ? "mx-auto h-48 w-48 border border-tinta"
                    : "mx-auto h-72 w-72 max-w-full border border-tinta object-contain"
              }
            />
            <figcaption className="text-sm">
              <strong>{imagem.rotulo}.</strong> {imagem.dica}
            </figcaption>
            <div className="flex flex-wrap gap-2">
              {podeCompartilharArquivo && imagem.formato !== "qrcode" && (
                <button type="button" className="botao botao-pequeno" disabled={enviando !== null} onClick={() => compartilhar(imagem.formato, imagem.url)}>
                  <Share2 className="size-4" aria-hidden />
                  {enviando === imagem.formato ? "Preparando…" : "Compartilhar com a imagem"}
                </button>
              )}
              <a href={imagem.url} download={nomeDoArquivoDaImagem(codigo, imagem.formato)} className="botao botao-vazado botao-pequeno">
                <Download className="size-4" aria-hidden />
                Baixar
              </a>
            </div>
          </figure>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="texto-pronto" className="rotulo">
          Texto pronto
        </label>
        <textarea id="texto-pronto" readOnly value={texto} rows={5} className="campo font-mono text-sm" onFocus={(e) => e.currentTarget.select()} />
        <div className="flex flex-wrap gap-2">
          <button type="button" className="botao botao-pequeno" onClick={() => copiarTexto()}>
            {copiado ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
            {copiado ? "Copiado" : "Copiar texto"}
          </button>
          <a href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noopener noreferrer" className="botao botao-vazado botao-pequeno">
            Enviar o texto pelo WhatsApp
          </a>
          <Link href={`/cartaz/${codigo}`} target="_blank" className="botao botao-vazado botao-pequeno">
            <Printer className="size-4" aria-hidden />
            Cartaz para imprimir
          </Link>
        </div>
      </div>

      <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
        <li>Poste a imagem no status do WhatsApp e cole o texto na legenda: o link leva às fotos e à mensagem.</li>
        <li>Nos grupos de compra e venda da sua cidade, siga a regra de cada grupo e mande a imagem quadrada com o texto.</li>
        <li>Imprima o cartaz e cole no vidro do carro, no mural do prédio, da igreja ou da padaria.</li>
        <li>Quem responde pelo site não vê o seu telefone: você decide se passa o número.</li>
      </ul>
    </div>
  )
}
