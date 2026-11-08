// APRESENTAÇÃO — caderno de uma cidade: as seções com a quantidade de anúncios no ar (RF-05, RNF-01).

import type { Metadata } from "next"
import Link from "next/link"
import { Filtros } from "@/components/jornal/filtros"
import { Faixa } from "@/components/jornal/pecas"
import { container } from "@/infrastructure/container"
import { plural } from "@/lib/formatadores"
import { caminhoDaSecao } from "@/lib/site"
import { cn } from "@/lib/utils"
import { cidadeDoEndereco } from "../../localizar"

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
  const [secoes, contagem] = await Promise.all([c.classificados.categoriasAtivas(), c.classificados.contagemPorCategoria(cidade.codigo, c.relogio.agora())])
  const total = Object.values(contagem).reduce((soma, n) => soma + n, 0)

  return (
    <div className="flex flex-col gap-6 pt-5">
      <Filtros secoes={secoes.map(({ id, nome, slug }) => ({ id, nome, slug }))} ufInicial={cidade.uf} cidadeInicial={cidade} />

      <section aria-labelledby="titulo-cidade">
        <Faixa como="h1" className="mb-1">
          <span id="titulo-cidade">
            Classificados de {cidade.nome}/{cidade.uf}
          </span>
        </Faixa>
        <p className="mb-4 text-sm text-tinta-suave">
          {total > 0 ? `${plural(total, "anúncio no ar", "anúncios no ar")}. Escolha a seção.` : "Ainda não há anúncios no ar nesta cidade."}
        </p>

        <ul className="grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
          {secoes.map((secao) => {
            const n = contagem[secao.id] ?? 0
            return (
              <li key={secao.id}>
                <Link
                  href={caminhoDaSecao(cidade, secao.slug)}
                  className={cn("flex items-center justify-between gap-3 border-b border-fio py-2 hover:bg-papel-escuro", n === 0 && "text-tinta-suave")}
                >
                  <span className="font-titulo font-semibold uppercase tracking-wide">{secao.nome}</span>
                  <span className={cn("shrink-0 font-titulo text-sm", n > 0 && "faixa px-2 py-0.5")}>{n}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>

      {total === 0 && (
        <section className="cartao flex flex-col items-start gap-3 p-5">
          <p className="font-titulo text-xl font-bold uppercase">Seja o primeiro a anunciar em {cidade.nome}</p>
          <p>O anúncio aparece no caderno da cidade assim que o Pix é confirmado.</p>
          <Link href={`/minha-conta/anuncios/novo?uf=${cidade.uf}&cidade=${cidade.codigo}`} className="botao">
            Anunciar em {cidade.nome}
          </Link>
        </section>
      )}
    </div>
  )
}
