// APRESENTAÇÃO — o que o Google lê do site (feature 011: RF-110 a RF-112, RN-110 a RN-114).
// Entradas de anúncio no sitemap e dados estruturados (JSON-LD do schema.org) da página do anúncio.

import type { AnuncioPublicoDTO } from "@/application/queries/consultas"
import type { Cidade } from "@/domain/localidade/uf"
import { urlImagem } from "@/lib/imagens"
import { caminhoDaCidade, caminhoDaSecao, caminhoDoAnuncio } from "@/lib/site"

/** RN-114: o formato aceita 50.000 endereços por arquivo; a folga fica para cidades e seções. */
export const LIMITE_DE_ANUNCIOS_NO_SITEMAP = 40_000

/** RN-112: vaga, currículo e aula não são mercadoria. */
const SECOES_QUE_NAO_SAO_PRODUTO = new Set(["empregos-e-formacao-profissional"])

export interface EntradaDoSitemap {
  url: string
  lastModified?: Date
  changeFrequency: "weekly"
  priority: number
}

/** RF-110: cada anúncio no ar com o seu endereço público e a data em que foi publicado ou renovado. */
export function entradasDeAnuncios(
  base: string,
  anuncios: Array<{ codigo: string; publicadoEm: Date | null }>,
  limite = LIMITE_DE_ANUNCIOS_NO_SITEMAP,
): EntradaDoSitemap[] {
  return anuncios.slice(0, limite).map(({ codigo, publicadoEm }) => ({
    url: `${base}${caminhoDoAnuncio(codigo)}`,
    ...(publicadoEm ? { lastModified: publicadoEm } : {}),
    changeFrequency: "weekly",
    priority: 0.6,
  }))
}

type No = Record<string, unknown>

/**
 * RF-111 e RF-112: trilha sempre; produto com oferta só quando há preço e a seção é de mercadoria.
 * RN-110: só o que a página já mostra a qualquer visitante, sem nada do dono.
 */
export function dadosEstruturadosDoAnuncio({
  anuncio,
  cidade,
  base,
}: {
  anuncio: AnuncioPublicoDTO
  cidade: Pick<Cidade, "nome" | "uf" | "slug">
  base: string
}): { "@context": string; "@graph": No[] } {
  const endereco = `${base}${caminhoDoAnuncio(anuncio.codigo)}`
  const grafo: No[] = [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: `${base}/` },
        { "@type": "ListItem", position: 2, name: `${cidade.nome}/${cidade.uf}`, item: `${base}${caminhoDaCidade(cidade)}` },
        { "@type": "ListItem", position: 3, name: anuncio.categoriaNome, item: `${base}${caminhoDaSecao(cidade, anuncio.categoriaSlug)}` },
        { "@type": "ListItem", position: 4, name: anuncio.titulo, item: endereco },
      ],
    },
  ]

  // RN-111 e RN-112.
  if (anuncio.precoCentavos !== null && !SECOES_QUE_NAO_SAO_PRODUTO.has(anuncio.categoriaSlug)) {
    const oferta: No = {
      "@type": "Offer",
      url: endereco,
      price: precoParaSchema(anuncio.precoCentavos),
      priceCurrency: "BRL",
      availability: "https://schema.org/InStock",
      ...(anuncio.expiraEm ? { priceValidUntil: diaEmBrasilia(anuncio.expiraEm) } : {}),
      availableAtOrFrom: {
        "@type": "Place",
        address: { "@type": "PostalAddress", addressLocality: cidade.nome, addressRegion: cidade.uf, addressCountry: "BR" },
      },
    }
    grafo.push({
      "@type": "Product",
      name: anuncio.titulo,
      description: anuncio.texto,
      category: anuncio.categoriaNome,
      sku: anuncio.codigo,
      url: endereco,
      ...(anuncio.fotos.length > 0 ? { image: anuncio.fotos.map((foto) => urlImagem(foto.url, { largura: 1200 })) } : {}),
      offers: oferta,
    })
  }

  return { "@context": "https://schema.org", "@graph": grafo }
}

/**
 * RN-113: texto pronto para dentro de <script type="application/ld+json">.
 * `<`, `>` e `&` viram escapes do JSON; quem lê o JSON recebe o texto original.
 */
export function jsonLdSeguro(dados: unknown): string {
  return JSON.stringify(dados).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026")
}

/** Centavos inteiros para o formato do schema.org: ponto decimal e duas casas, sem separador de milhar. */
function precoParaSchema(centavos: number): string {
  return `${Math.floor(centavos / 100)}.${String(centavos % 100).padStart(2, "0")}`
}

/** AAAA-MM-DD no fuso de Brasília, o dia que o anunciante vê na tela. */
function diaEmBrasilia(data: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(data)
}
