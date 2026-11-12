import type { MetadataRoute } from "next"
import { container } from "@/infrastructure/container"
import { LIMITE_DE_ANUNCIOS_NO_SITEMAP, entradasDeAnuncios } from "@/lib/dados-estruturados"
import { caminhoDaCidade, caminhoDaSecao, urlDoSite } from "@/lib/site"

export const dynamic = "force-dynamic"

/**
 * Só cidades e seções com anúncio no ar: página vazia não entra no índice do Google.
 * Feature 011 (RF-110, RN-114): cada anúncio no ar entra com o seu endereço público.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = urlDoSite()
  const c = container()
  const agora = c.relogio.agora()
  const [combinacoes, anuncios] = await Promise.all([
    c.classificados.combinacoesNoAr(agora).catch(() => []),
    c.classificados.anunciosNoArDoSitemap(agora, LIMITE_DE_ANUNCIOS_NO_SITEMAP).catch(() => []),
  ])
  const enderecos = new Set<string>(["/", "/como-funciona"])
  for (const item of combinacoes) {
    const cidade = c.localidades.cidade(item.cidadeCodigo)
    if (!cidade) continue
    enderecos.add(caminhoDaCidade(cidade))
    enderecos.add(caminhoDaSecao(cidade, item.categoriaSlug))
  }
  const paginas: MetadataRoute.Sitemap = [...enderecos].map((caminho) => ({
    url: `${base}${caminho}`,
    changeFrequency: "daily",
    priority: caminho === "/" ? 1 : 0.7,
  }))
  return [...paginas, ...entradasDeAnuncios(base, anuncios)]
}
