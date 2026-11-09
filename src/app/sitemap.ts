import type { MetadataRoute } from "next"
import { container } from "@/infrastructure/container"
import { caminhoDaCidade, caminhoDaSecao, urlDoSite } from "@/lib/site"

export const dynamic = "force-dynamic"

/** Só cidades e seções com anúncio no ar: página vazia não entra no índice do Google. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = urlDoSite()
  const c = container()
  const combinacoes = await c.classificados.combinacoesNoAr(c.relogio.agora()).catch(() => [])
  const enderecos = new Set<string>(["/", "/como-funciona"])
  for (const item of combinacoes) {
    const cidade = c.localidades.cidade(item.cidadeCodigo)
    if (!cidade) continue
    enderecos.add(caminhoDaCidade(cidade))
    enderecos.add(caminhoDaSecao(cidade, item.categoriaSlug))
  }
  return [...enderecos].map((caminho) => ({ url: `${base}${caminho}`, changeFrequency: "daily", priority: caminho === "/" ? 1 : 0.7 }))
}
