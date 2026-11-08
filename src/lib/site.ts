// APRESENTAÇÃO — nome do jornal e endereços públicos (RF-05: cidade e seção têm endereço próprio).

import type { Cidade } from "@/domain/localidade/uf"

export const NOME_DO_SITE = "Classificados Digitais do Brasil"

export function urlDoSite(): string {
  const configurada = process.env.NEXT_PUBLIC_URL?.trim()
  if (configurada) return configurada.replace(/\/$/, "")
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  return "http://localhost:3000"
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
