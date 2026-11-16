// APRESENTAÇÃO — cartaz A4 para imprimir, com QR Code do anúncio (feature 005: RF-74) e VENDE-SE no alto (feature 019: RF-190, RF-191).
// Para colar no vidro do carro, no mural da igreja, na padaria: quem aponta a câmera cai na página do anúncio.

import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { codigoValido } from "@/domain/anuncio/anuncio"
import { TITULOS_DO_CARTAZ, type TituloDoCartaz, tituloDoCartaz } from "@/domain/anuncio/cartaz"
import { container } from "@/infrastructure/container"
import { formatarReais } from "@/lib/formatadores"
import { urlImagem } from "@/lib/imagens"
import { linkCurtoDoAnuncio, qrCodeDoAnuncioEmDataUrl } from "@/lib/qrcode"
import { BotaoImprimir } from "./botao-imprimir"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Cartaz do anúncio", robots: { index: false } }

export default async function Cartaz({ params, searchParams }: { params: Promise<{ codigo: string }>; searchParams: Promise<{ titulo?: string }> }) {
  const codigo = (await params).codigo.toUpperCase()
  if (!codigoValido(codigo)) notFound()
  const c = container()
  const anuncio = await c.classificados.anuncioNoAr(codigo, c.relogio.agora())
  if (!anuncio) notFound()
  const cidade = c.localidades.cidade(anuncio.cidadeCodigo)
  // Feature 022 (RF-220): o mesmo QR Code do anúncio usado em todo o sistema.
  const link = linkCurtoDoAnuncio(anuncio.codigo)
  const qr = await qrCodeDoAnuncioEmDataUrl(anuncio.codigo, 520)
  const foto = anuncio.fotos[0]
  // RN-190 e RN-191: a palavra do alto vem do endereço ou do padrão da seção.
  const titulo = tituloDoCartaz((await searchParams).titulo, anuncio.categoriaSlug)
  const ondeEQue = `${cidade ? `${cidade.nome}/${cidade.uf}` : ""} · ${anuncio.categoriaNome}`

  return (
    <main className="mx-auto flex min-h-dvh max-w-[210mm] flex-col bg-white p-6 print:p-0">
      <style>{"@page { size: A4; margin: 12mm } @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact } }"}</style>
      <div className="mb-4 flex flex-col gap-3 print:hidden">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm">Imprima em A4 e cole onde as pessoas passam. O QR Code abre o anúncio.</p>
          <BotaoImprimir />
        </div>
        {/* RF-191: a escolha não sai na impressão. */}
        <nav aria-label="Palavra no alto do cartaz" className="flex flex-wrap items-center gap-2 text-sm">
          <span>No alto do cartaz:</span>
          {(Object.keys(TITULOS_DO_CARTAZ) as TituloDoCartaz[]).map((chave) => (
            <Link
              key={chave}
              href={`/cartaz/${anuncio.codigo}?titulo=${chave}`}
              aria-current={chave === titulo ? "true" : undefined}
              className={chave === titulo ? "border border-tinta px-2 py-0.5 font-bold uppercase" : "px-2 py-0.5 uppercase underline"}
            >
              {TITULOS_DO_CARTAZ[chave]}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex flex-1 flex-col border-[6px] border-double border-tinta p-6">
        {titulo === "classificados" ? (
          <>
            <p className="text-center font-manchete text-[3.2rem] uppercase leading-none">Classificados</p>
            <div className="mt-1 flex justify-between border-y border-tinta py-0.5 font-titulo text-xs font-semibold uppercase tracking-[0.2em]">
              <span>Digitais do Brasil</span>
              <span>{ondeEQue}</span>
            </div>
          </>
        ) : (
          <>
            {/* RF-190: a palavra da placa de rua, grande; o jornal vai na linha de baixo. */}
            <p className="text-center font-manchete text-[5.5rem] uppercase leading-none tracking-wide">{TITULOS_DO_CARTAZ[titulo]}</p>
            <p className="mt-2 border-y border-tinta py-0.5 text-center font-titulo text-xs font-semibold uppercase tracking-[0.2em]">
              Classificados Digitais do Brasil · {ondeEQue}
            </p>
          </>
        )}

        <h1 className="mt-6 bg-tinta px-3 py-2 text-center font-titulo text-[2.6rem] font-bold uppercase leading-tight text-white">{anuncio.titulo}</h1>

        {foto && (
          <div className={`relative mt-5 w-full border border-tinta ${titulo === "classificados" ? "h-[80mm]" : "h-[72mm]"}`}>
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
