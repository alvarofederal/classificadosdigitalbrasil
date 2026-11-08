// APRESENTAÇÃO — a página do caderno: UMA seção de UMA cidade, em colunas de jornal (RF-06, RNF-01).

import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { AcoesAnuncio } from "@/components/jornal/acoes-anuncio"
import { CaixaAnuncio } from "@/components/jornal/caixa-anuncio"
import { Filtros } from "@/components/jornal/filtros"
import { Faixa, Paginacao } from "@/components/jornal/pecas"
import { container } from "@/infrastructure/container"
import { paginaDe } from "@/lib/formularios"
import { formatarReais, plural } from "@/lib/formatadores"
import { caminhoDaCidade, caminhoDaSecao } from "@/lib/site"
import { cidadeDoEndereco } from "../../../localizar"

const POR_PAGINA = 40

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

  return (
    <div className="flex flex-col gap-5 pt-5">
      <Filtros secoes={secoes.map(({ id, nome, slug }) => ({ id, nome, slug }))} ufInicial={cidade.uf} cidadeInicial={cidade} secaoInicial={secao.slug} />

      <div>
        <Faixa como="h1" className="text-2xl sm:text-3xl">
          {secao.nome}
        </Faixa>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-fio py-1.5 font-titulo text-xs uppercase tracking-wider">
          <Link href={caminhoDaCidade(cidade)} className="hover:underline">
            ← {cidade.nome}/{cidade.uf} · todas as seções
          </Link>
          <span>{plural(lista.total, "anúncio", "anúncios")}</span>
        </div>
      </div>

      {lista.itens.length > 0 ? (
        <>
          <div className="colunas-jornal columns-1 sm:columns-2 lg:columns-3 xl:columns-4">
            {lista.itens.map((anuncio) => (
              <CaixaAnuncio
                key={anuncio.id}
                className="mb-4"
                conteudo={anuncio}
                rodape={<AcoesAnuncio anuncio={{ id: anuncio.id, codigo: anuncio.codigo, titulo: anuncio.titulo, fotos: anuncio.fotos }} />}
              />
            ))}
          </div>
          <Paginacao pagina={pagina} total={lista.total} porPagina={POR_PAGINA} endereco={(p) => (p === 1 ? caminho : `${caminho}?pagina=${p}`)} />
        </>
      ) : (
        <div className="cartao flex flex-col items-start gap-3 p-5">
          <p className="font-titulo text-xl font-bold uppercase">
            Ainda não há anúncios de {secao.nome} em {cidade.nome}/{cidade.uf}
          </p>
          <p>
            Anuncie nesta seção por {formatarReais(tabela.valorAnuncioCentavos)} a cada {plural(tabela.diasDePublicacao, "dia", "dias")}.
          </p>
          <Link href={novoAnuncio} className="botao">
            Anunciar aqui
          </Link>
        </div>
      )}

      {lista.itens.length > 0 && (
        <p className="text-center text-sm">
          <Link href={novoAnuncio} className="link">
            Anuncie também nesta seção
          </Link>
        </p>
      )}
    </div>
  )
}
