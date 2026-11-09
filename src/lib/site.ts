// APRESENTAÇÃO — nome do jornal e endereços públicos (RF-05: cidade e seção têm endereço próprio).

import type { Cidade } from "@/domain/localidade/uf"

export const NOME_DO_SITE = "Classificados Digitais do Brasil"

/**
 * Endereço público do site: link curto, QR do cartaz, prévia nas redes e aviso do gateway dependem dele.
 * Na Vercel vale o domínio de produção que a própria Vercel informa (passa a ser o domínio próprio quando houver);
 * NEXT_PUBLIC_URL só fora da Vercel. Assim uma variável copiada de outro projeto não manda links para lá.
 */
export function urlDoSite(): string {
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  const configurada = process.env.NEXT_PUBLIC_URL?.trim()
  return configurada ? configurada.replace(/\/$/, "") : "http://localhost:3000"
}

export function caminhoDaCidade(cidade: Pick<Cidade, "uf" | "slug">): string {
  return `/${cidade.uf.toLowerCase()}/${cidade.slug}`
}

export function caminhoDaSecao(cidade: Pick<Cidade, "uf" | "slug">, categoriaSlug: string): string {
  return `${caminhoDaCidade(cidade)}/${categoriaSlug}`
}

export function caminhoDoAnuncio(codigo: string): string {
  return `/anuncio/${codigo}`
}
