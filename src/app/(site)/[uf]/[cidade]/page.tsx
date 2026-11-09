// APRESENTAÇÃO — o caderno de uma cidade: todas as seções em colunas, como a página impressa (RF-05).
// Cada seção é uma consulta própria e limitada (RNF-01); "ver todos" leva à página da seção.

import type { Metadata } from "next"
import Link from "next/link"
import { Fragment } from "react"
import { AnuncioDaCasa, AnuncioDoCaderno, Caderno, RodapeDaCasa, TarjaSecao, estiloDaCasa } from "@/components/jornal/caderno"
import { Filtros } from "@/components/jornal/filtros"
import { LembrarCidade } from "@/components/jornal/perto-de-mim"
import { container } from "@/infrastructure/container"
import { plural } from "@/lib/formatadores"
import { precoInicial } from "@/lib/planos"
import { chamadaDaSecao, descricaoDaSecao } from "@/lib/secoes"
import { caminhoDaSecao } from "@/lib/site"
import { cidadeDoEndereco } from "../../localizar"

const POR_SECAO = 8

type Props = { params: Promise<{ uf: string; cidade: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { uf, cidade: slug } = await params
  const cidade = cidadeDoEndereco(uf, slug)
  return {
    title: `Classificados em ${cidade.nome}/${cidade.uf}`,
    description: `Anúncios classificados de ${cidade.nome}/${cidade.uf}: imóveis, veículos, empregos, serviços e mais.`,
    alternates: { canonical: `/${uf}/${slug}` },
  }
}

export default async function PaginaDaCidade({ params }: Props) {
  const { uf, cidade: slug } = await params
  const cidade = cidadeDoEndereco(uf, slug)
  const c = container()
  const agora = c.relogio.agora()
  const [secoes, contagem, planos] = await Promise.all([
    c.classificados.categoriasAtivas(),
    c.classificados.contagemPorCategoria(cidade.codigo, agora),
    c.classificados.planosAVenda(),
  ])
  const comAnuncios = secoes.filter((s) => (contagem[s.id] ?? 0) > 0).map((s) => s.id)
  const anuncios = comAnuncios.length > 0 ? await c.classificados.primeirosPorSecao({ cidadeCodigo: cidade.codigo, categoriaIds: comAnuncios, limite: POR_SECAO, agora }) : {}
  const total = Object.values(contagem).reduce((soma, n) => soma + n, 0)
  const preco = `a partir de ${precoInicial(planos)}`
  const anunciarAqui = (categoriaId?: string) => `/minha-conta/anuncios/novo?uf=${cidade.uf}&cidade=${cidade.codigo}${categoriaId ? `&categoria=${categoriaId}` : ""}`

  return (
    <div className="pt-3">
      <LembrarCidade uf={cidade.uf} slug={cidade.slug} nome={cidade.nome} />
      <section aria-label="Procurar anúncios" className="border-b-2 border-tinta pb-3">
        <Filtros secoes={secoes.map(({ id, nome, slug }) => ({ id, nome, slug }))} ufInicial={cidade.uf} cidadeInicial={cidade} />
      </section>

      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-tinta py-1.5">
        <h1 className="font-titulo text-xl font-bold uppercase sm:text-2xl">
          {cidade.nome}/{cidade.uf}
        </h1>
        <span className="font-titulo text-xs uppercase tracking-wider">{total > 0 ? plural(total, "anúncio no ar", "anúncios no ar") : "Nenhum anúncio no ar ainda"}</span>
      </div>

      <Caderno className="mt-3">
        {secoes.map((secao, i) => {
          const lista = anuncios[secao.id] ?? []
          const quantos = contagem[secao.id] ?? 0
          const linkSecao = caminhoDaSecao(cidade, secao.slug)
          if (lista.length === 0) {
            return (
              <div key={secao.id}>
                <TarjaSecao href={linkSecao}>{secao.nome}</TarjaSecao>
                <AnuncioDaCasa
                  href={anunciarAqui(secao.id)}
                  conteudo={{
                    titulo: chamadaDaSecao(secao.slug, secao.nome),
                    texto: `${descricaoDaSecao(secao.slug)} Ainda sem anúncios em ${cidade.nome}.`,
                    precoCentavos: null,
                    estilo: estiloDaCasa(i),
                  }}
                  rodape={<RodapeDaCasa preco={preco} />}
                />
              </div>
            )
          }
          const [primeiro, ...resto] = lista
          return (
            <Fragment key={secao.id}>
              <div>
                <TarjaSecao href={linkSecao}>{secao.nome}</TarjaSecao>
                <AnuncioDoCaderno anuncio={primeiro} />
              </div>
              {resto.map((anuncio) => (
                <AnuncioDoCaderno key={anuncio.id} anuncio={anuncio} />
              ))}
              {quantos > lista.length && (
                <Link href={linkSecao} className="block border border-tinta px-2 py-1 text-center font-titulo text-xs font-bold uppercase hover:bg-papel-escuro">
                  Ver os {quantos} anúncios de {secao.nome} →
                </Link>
              )}
            </Fragment>
          )
        })}
      </Caderno>
    </div>
  )
}
