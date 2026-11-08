// APRESENTAÇÃO — a página de UMA seção de UMA cidade, em colunas de jornal (RF-06, RNF-01).

import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { AnuncioDaCasa, AnuncioDoCaderno, Caderno, TarjaSecao } from "@/components/jornal/caderno"
import { Filtros } from "@/components/jornal/filtros"
import { Paginacao } from "@/components/jornal/pecas"
import { container } from "@/infrastructure/container"
import { paginaDe } from "@/lib/formularios"
import { formatarReais, plural } from "@/lib/formatadores"
import { caminhoDaCidade, caminhoDaSecao } from "@/lib/site"
import { cidadeDoEndereco } from "../../../localizar"

const POR_PAGINA = 60

type Props = {
  params: Promise<{ uf: string; cidade: string; categoria: string }>
  searchParams: Promise<{ pagina?: string }>
}

async function secaoDoEndereco(slug: string) {
  const secoes = await container().classificados.categoriasAtivas()
  const secao = secoes.find((s) => s.slug === slug)
  if (!secao) notFound()
  return { secao, secoes }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { uf, cidade: slugCidade, categoria } = await params
  const cidade = cidadeDoEndereco(uf, slugCidade)
  const { secao } = await secaoDoEndereco(categoria)
  return {
    title: `${secao.nome} em ${cidade.nome}/${cidade.uf}`,
    description: `Classificados de ${secao.nome.toLowerCase()} em ${cidade.nome}/${cidade.uf}.`,
    alternates: { canonical: caminhoDaSecao(cidade, secao.slug) },
  }
}

export default async function PaginaDaSecao({ params, searchParams }: Props) {
  const { uf, cidade: slugCidade, categoria } = await params
  const cidade = cidadeDoEndereco(uf, slugCidade)
  const { secao, secoes } = await secaoDoEndereco(categoria)
  const pagina = paginaDe((await searchParams).pagina)
  const c = container()
  const agora = c.relogio.agora()

  const [lista, tabela] = await Promise.all([
    c.classificados.anunciosDaCategoria({ cidadeCodigo: cidade.codigo, categoriaId: secao.id, pagina, porPagina: POR_PAGINA, agora }),
    c.configuracao.obter(),
  ])
  const caminho = caminhoDaSecao(cidade, secao.slug)
  const novoAnuncio = `/minha-conta/anuncios/novo?uf=${cidade.uf}&cidade=${cidade.codigo}&categoria=${secao.id}`
  const preco = `${formatarReais(tabela.valorAnuncioCentavos)} por ${plural(tabela.diasDePublicacao, "dia", "dias")}`
  const [primeiro, ...resto] = lista.itens

  return (
    <div className="pt-3">
      <section aria-label="Procurar anúncios" className="border-b-2 border-tinta pb-3">
        <Filtros secoes={secoes.map(({ id, nome, slug }) => ({ id, nome, slug }))} ufInicial={cidade.uf} cidadeInicial={cidade} secaoInicial={secao.slug} />
      </section>

      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-tinta py-1.5">
        <h1 className="font-titulo text-xl font-bold uppercase sm:text-2xl">
          {secao.nome} · {cidade.nome}/{cidade.uf}
        </h1>
        <span className="flex gap-4 font-titulo text-xs uppercase tracking-wider">
          <span>{plural(lista.total, "anúncio", "anúncios")}</span>
          <Link href={caminhoDaCidade(cidade)} className="hover:underline">
            Todas as seções
          </Link>
        </span>
      </div>

      <Caderno className="mt-3">
        <div>
          <TarjaSecao>{secao.nome}</TarjaSecao>
          {primeiro ? (
            <AnuncioDoCaderno anuncio={primeiro} />
          ) : (
            <AnuncioDaCasa
              href={novoAnuncio}
              conteudo={{
                titulo: "Anuncie aqui",
                texto: `Ainda não há anúncios de ${secao.nome.toLowerCase()} em ${cidade.nome}. Seja o primeiro: ${preco}.`,
                precoCentavos: null,
                estilo: { moldura: "DUPLA", estiloTitulo: "TARJA", alinhamento: "CENTRO", estrelas: true },
              }}
            />
          )}
        </div>
        {resto.map((anuncio) => (
          <AnuncioDoCaderno key={anuncio.id} anuncio={anuncio} />
        ))}
        {primeiro && (
          <AnuncioDaCasa
            href={novoAnuncio}
            conteudo={{
              titulo: "Anuncie nesta seção",
              texto: `${secao.nome} em ${cidade.nome}: ${preco}.`,
              precoCentavos: null,
              estilo: { moldura: "TRACEJADA", estiloTitulo: "NEGRITO", alinhamento: "CENTRO", estrelas: false },
            }}
          />
        )}
      </Caderno>
      <Paginacao pagina={pagina} total={lista.total} porPagina={POR_PAGINA} endereco={(p) => (p === 1 ? caminho : `${caminho}?pagina=${p}`)} />
    </div>
  )
}
