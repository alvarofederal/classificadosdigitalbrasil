// APRESENTAÇÃO — a página do caderno: colunas estreitas e densas, com a tarja da seção dentro da coluna,
// como no classificado impresso (spec/04-design-system.md).

import Link from "next/link"
import type { ReactNode } from "react"
import type { AnuncioPublicoDTO } from "@/application/queries/consultas"
import type { EstiloDoAnuncio } from "@/domain/anuncio/anuncio"
import { cn } from "@/lib/utils"
import { AcoesAnuncio } from "./acoes-anuncio"
import { CaixaAnuncio, type ConteudoDaCaixa } from "./caixa-anuncio"

export function Caderno({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("colunas-jornal columns-1 min-[460px]:columns-2 md:columns-3 lg:columns-4 xl:columns-5", className)}>{children}</div>
}

export function TarjaSecao({ children, href }: { children: ReactNode; href?: string }) {
  const conteudo = <h2 className="tarja-secao">{children}</h2>
  return href ? (
    <Link href={href} className="block hover:opacity-90">
      {conteudo}
    </Link>
  ) : (
    conteudo
  )
}

export function AnuncioDoCaderno({ anuncio }: { anuncio: AnuncioPublicoDTO }) {
  return (
    <CaixaAnuncio
      conteudo={anuncio}
      rodape={<AcoesAnuncio anuncio={{ id: anuncio.id, codigo: anuncio.codigo, titulo: anuncio.titulo, fotos: anuncio.fotos }} />}
    />
  )
}

/** Os estilos se alternam para os anúncios da casa não saírem todos iguais, como na página impressa. */
const ESTILOS_DA_CASA: EstiloDoAnuncio[] = [
  { moldura: "SIMPLES", estiloTitulo: "NEGRITO", alinhamento: "ESQUERDA", estrelas: false },
  { moldura: "DUPLA", estiloTitulo: "TARJA", alinhamento: "CENTRO", estrelas: false },
  { moldura: "TRACEJADA", estiloTitulo: "SUBLINHADO", alinhamento: "ESQUERDA", estrelas: false },
  { moldura: "SIMPLES", estiloTitulo: "NEGRITO", alinhamento: "CENTRO", estrelas: true },
  { moldura: "NENHUMA", estiloTitulo: "NEGRITO", alinhamento: "ESQUERDA", estrelas: false },
  { moldura: "DUPLA", estiloTitulo: "SUBLINHADO", alinhamento: "ESQUERDA", estrelas: false },
]

export function estiloDaCasa(indice: number): EstiloDoAnuncio {
  return ESTILOS_DA_CASA[indice % ESTILOS_DA_CASA.length]
}

/** Linha final do convite: "Anuncie aqui · R$ 1,00 por 7 dias". */
export function RodapeDaCasa({ preco }: { preco: string }) {
  return (
    <p className="flex min-h-5 items-center justify-between gap-2 font-titulo text-[0.62rem] font-semibold uppercase tracking-wide">
      <span>Anuncie aqui</span>
      <span>{preco}</span>
    </p>
  )
}

/** Anúncio do próprio jornal (convite para anunciar, avisos). Pode virar link inteiro. */
export function AnuncioDaCasa({ conteudo, href, rodape }: { conteudo: ConteudoDaCaixa; href?: string; rodape?: ReactNode }) {
  const caixa = <CaixaAnuncio conteudo={conteudo} rodape={rodape} />
  return href ? (
    <Link href={href} className="block hover:bg-papel-escuro [&_article]:hover:bg-papel-escuro">
      {caixa}
    </Link>
  ) : (
    caixa
  )
}
