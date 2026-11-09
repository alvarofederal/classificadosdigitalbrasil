// APRESENTAÇÃO — página individual do anúncio para divulgar em qualquer lugar (feature 005: RF-70 a RF-75).
// Vale para todos os planos: fotos, o anúncio no formato do caderno, caixa de conversa aberta, botões de divulgar e cartaz.

import type { Metadata } from "next"
import Link from "next/link"
import { AcoesAnuncio, FormularioMensagem } from "@/components/jornal/acoes-anuncio"
import { CaixaAnuncio } from "@/components/jornal/caixa-anuncio"
import { Divulgar } from "@/components/jornal/divulgar"
import { Galeria } from "@/components/jornal/galeria"
import { codigoValido } from "@/domain/anuncio/anuncio"
import { planoTemDestaque } from "@/domain/plano/plano"
import { container } from "@/infrastructure/container"
import { formatarDia, formatarReais } from "@/lib/formatadores"
import { precoInicial } from "@/lib/planos"
import { caminhoDaSecao, urlDoSite } from "@/lib/site"

type Props = { params: Promise<{ codigo: string }> }

async function buscar(codigoParam: string) {
  const codigo = codigoParam.toUpperCase()
  if (!codigoValido(codigo)) return null
  const c = container()
  const anuncio = await c.classificados.anuncioNoAr(codigo, c.relogio.agora())
  const cidade = anuncio ? c.localidades.cidade(anuncio.cidadeCodigo) : null
  return anuncio && cidade ? { anuncio, cidade } : null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const achado = await buscar((await params).codigo)
  if (!achado) return { title: "Anúncio fora do ar", robots: { index: false } }
  const { anuncio, cidade } = achado
  const preco = anuncio.precoCentavos !== null ? ` · ${formatarReais(anuncio.precoCentavos)}` : ""
  const descricao = `${anuncio.texto.slice(0, 140)}${preco} · ${cidade.nome}/${cidade.uf}`
  return {
    title: `${anuncio.titulo} · ${cidade.nome}/${cidade.uf}`,
    description: descricao,
    alternates: { canonical: `/anuncio/${anuncio.codigo}` },
    openGraph: { title: anuncio.titulo, description: descricao, type: "article" },
    twitter: { card: "summary_large_image", title: anuncio.titulo, description: descricao },
  }
}

export default async function PaginaDoAnuncio({ params }: Props) {
  const c = container()
  const achado = await buscar((await params).codigo)
  const planos = await c.classificados.planosAVenda()

  // RN-70: fora do ar não é erro; é convite para anunciar.
  if (!achado) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-16 text-center">
        <p className="font-manchete text-5xl uppercase">Saiu do caderno</p>
        <p>Este anúncio não está mais no ar. Ele pode ter sido vendido ou o prazo terminou.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/" className="botao botao-vazado">
            Ver outros anúncios
          </Link>
          <Link href="/minha-conta/anuncios/novo" className="botao">
            Anunciar a partir de {precoInicial(planos)}
          </Link>
        </div>
      </div>
    )
  }

  const { anuncio, cidade } = achado
  await c.registrarVisita.executar(anuncio.codigo)
  const linkCurto = `${urlDoSite()}/a/${anuncio.codigo}`

  return (
    <div className="grid gap-8 pt-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <nav className="font-titulo text-xs uppercase tracking-wider" aria-label="Caminho">
          <Link href={caminhoDaSecao(cidade, anuncio.categoriaSlug)} className="hover:underline">
            ← {anuncio.categoriaNome} · {cidade.nome}/{cidade.uf}
          </Link>
        </nav>
        <Galeria fotos={anuncio.fotos} titulo={anuncio.titulo} />
        <CaixaAnuncio
          grande
          destaque={planoTemDestaque(anuncio.planoCodigo)}
          conteudo={anuncio}
          rodape={<AcoesAnuncio anuncio={{ id: anuncio.id, codigo: anuncio.codigo, titulo: anuncio.titulo, fotos: anuncio.fotos }} mostrarCodigo={false} />}
        />
        <p className="font-titulo text-xs uppercase tracking-wider text-tinta-suave">
          Código {anuncio.codigo} · no ar até {formatarDia(anuncio.expiraEm)} ·{" "}
          <Link href={`/como-funciona?assunto=DENUNCIA&anuncio=${anuncio.codigo}#contato`} className="underline hover:no-underline">
            Denunciar este anúncio
          </Link>
        </p>
      </div>

      <aside className="flex flex-col gap-6">
        <section aria-labelledby="titulo-conversa" className="border-2 border-tinta p-4">
          <h2 id="titulo-conversa" className="mb-3 font-titulo text-lg font-bold uppercase">
            Fale com o anunciante
          </h2>
          <FormularioMensagem anuncio={anuncio} prefixo="pagina" />
        </section>

        <section aria-labelledby="titulo-divulgar">
          <h2 id="titulo-divulgar" className="tarja-secao mb-3">
            Divulgue este anúncio
          </h2>
          <Divulgar titulo={anuncio.titulo} link={linkCurto} codigo={anuncio.codigo} />
        </section>

        <section className="border border-dashed border-tinta p-4 text-center">
          <p className="font-titulo text-lg font-bold uppercase">Anuncie você também</p>
          <p className="text-sm">Seu anúncio no caderno da sua cidade, a partir de {precoInicial(planos)}.</p>
          <Link href="/minha-conta/anuncios/novo" className="botao botao-pequeno mt-3">
            Criar meu anúncio
          </Link>
        </section>
      </aside>
    </div>
  )
}
