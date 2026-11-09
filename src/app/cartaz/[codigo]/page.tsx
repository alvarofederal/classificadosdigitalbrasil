// APRESENTAÇÃO — cartaz A4 para imprimir, com QR Code do anúncio (feature 005: RF-74).
// Para colar no vidro do carro, no mural da igreja, na padaria: quem aponta a câmera cai na página do anúncio.

import type { Metadata } from "next"
import Image from "next/image"
import { notFound } from "next/navigation"
import QRCode from "qrcode"
import { codigoValido } from "@/domain/anuncio/anuncio"
import { container } from "@/infrastructure/container"
import { formatarReais } from "@/lib/formatadores"
import { urlImagem } from "@/lib/imagens"
import { urlDoSite } from "@/lib/site"
import { BotaoImprimir } from "./botao-imprimir"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Cartaz do anúncio", robots: { index: false } }

export default async function Cartaz({ params }: { params: Promise<{ codigo: string }> }) {
  const codigo = (await params).codigo.toUpperCase()
  if (!codigoValido(codigo)) notFound()
  const c = container()
  const anuncio = await c.classificados.anuncioNoAr(codigo, c.relogio.agora())
  if (!anuncio) notFound()
  const cidade = c.localidades.cidade(anuncio.cidadeCodigo)
  const link = `${urlDoSite()}/a/${anuncio.codigo}`
  const qr = await QRCode.toDataURL(link, { margin: 1, width: 520, errorCorrectionLevel: "M", color: { dark: "#111111", light: "#ffffff" } })
  const foto = anuncio.fotos[0]

  return (
    <main className="mx-auto flex min-h-dvh max-w-[210mm] flex-col bg-white p-6 print:p-0">
      <style>{"@page { size: A4; margin: 12mm } @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact } }"}</style>
      <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
        <p className="text-sm">Imprima em A4 e cole onde as pessoas passam. O QR Code abre o anúncio.</p>
        <BotaoImprimir />
      </div>

      <div className="flex flex-1 flex-col border-[6px] border-double border-tinta p-6">
        <p className="text-center font-manchete text-[3.2rem] uppercase leading-none">Classificados</p>
        <div className="mt-1 flex justify-between border-y border-tinta py-0.5 font-titulo text-xs font-semibold uppercase tracking-[0.2em]">
          <span>Digitais do Brasil</span>
          <span>{cidade ? `${cidade.nome}/${cidade.uf}` : ""} · {anuncio.categoriaNome}</span>
        </div>

        <h1 className="mt-6 bg-tinta px-3 py-2 text-center font-titulo text-[2.6rem] font-bold uppercase leading-tight text-white">{anuncio.titulo}</h1>

        {foto && (
          <div className="relative mt-5 h-[80mm] w-full border border-tinta">
            <Image src={urlImagem(foto.url, { largura: 1400 })} alt={anuncio.titulo} fill sizes="190mm" className="object-contain" unoptimized />
          </div>
        )}

        <p className="mt-5 whitespace-pre-line text-center text-2xl leading-snug">{anuncio.texto}</p>
        {anuncio.precoCentavos !== null && <p className="mt-4 text-center font-manchete text-6xl">{formatarReais(anuncio.precoCentavos)}</p>}

        <div className="mt-auto flex items-center justify-center gap-6 border-t-2 border-tinta pt-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR Code do anúncio" width={170} height={170} />
          <div>
            <p className="font-titulo text-xl font-bold uppercase">Aponte a câmera do celular</p>
            <p className="text-lg">para ver fotos e falar com o anunciante</p>
            <p className="mt-2 font-mono text-lg">{link.replace(/^https?:\/\//, "")}</p>
          </div>
        </div>
      </div>
    </main>
  )
}
