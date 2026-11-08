// APRESENTAÇÃO — página própria do anúncio: link para compartilhar no WhatsApp (RF-07).

import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { AcoesAnuncio } from "@/components/jornal/acoes-anuncio"
import { CaixaAnuncio } from "@/components/jornal/caixa-anuncio"
import { codigoValido } from "@/domain/anuncio/anuncio"
import { container } from "@/infrastructure/container"
import { formatarDia } from "@/lib/formatadores"
import { urlImagem, urlOpenGraph } from "@/lib/imagens"
import { caminhoDaSecao } from "@/lib/site"

type Props = { params: Promise<{ codigo: string }> }

async function buscar(codigoParam: string) {
  const codigo = codigoParam.toUpperCase()
  if (!codigoValido(codigo)) notFound()
  const c = container()
  const anuncio = await c.classificados.anuncioNoAr(codigo, c.relogio.agora())
  if (!anuncio) notFound()
  const cidade = c.localidades.cidade(anuncio.cidadeCodigo)
  if (!cidade) notFound()
  return { anuncio, cidade }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { anuncio, cidade } = await buscar((await params).codigo)
  const descricao = anuncio.texto.slice(0, 160)
  return {
    title: `${anuncio.titulo} · ${cidade.nome}/${cidade.uf}`,
    description: descricao,
    alternates: { canonical: `/anuncio/${anuncio.codigo}` },
    openGraph: {
      title: anuncio.titulo,
      description: descricao,
      images: anuncio.fotos[0] ? [{ url: urlOpenGraph(anuncio.fotos[0].url), width: 1200, height: 630 }] : undefined,
    },
  }
}

export default async function PaginaDoAnuncio({ params }: Props) {
  const { anuncio, cidade } = await buscar((await params).codigo)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 pt-6">
      <nav className="font-titulo text-xs uppercase tracking-wider" aria-label="Caminho">
        <Link href={caminhoDaSecao(cidade, anuncio.categoriaSlug)} className="hover:underline">
          ← {anuncio.categoriaNome} · {cidade.nome}/{cidade.uf}
        </Link>
      </nav>

      <CaixaAnuncio
        grande
        conteudo={anuncio}
        rodape={<AcoesAnuncio anuncio={{ id: anuncio.id, codigo: anuncio.codigo, titulo: anuncio.titulo, fotos: anuncio.fotos }} mostrarCodigo={false} />}
      />

      {anuncio.fotos.length > 0 && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {anuncio.fotos.map((foto, i) => (
            <li key={foto.id} className="relative aspect-[4/3] border border-fio bg-papel-escuro">
              <Image src={urlImagem(foto.url, { largura: 600, altura: 450, recorte: true })} alt={`Foto ${i + 1} de ${anuncio.titulo}`} fill sizes="(max-width: 640px) 50vw, 220px" className="object-cover" unoptimized />
            </li>
          ))}
        </ul>
      )}

      <p className="font-titulo text-xs uppercase tracking-wider text-tinta-suave">
        Código {anuncio.codigo} · no ar até {formatarDia(anuncio.expiraEm)}
      </p>
    </div>
  )
}
