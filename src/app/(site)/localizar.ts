// APRESENTAÇÃO — resolve os segmentos do endereço (/df/brasilia/veiculos) em UF, cidade e seção.

import { notFound } from "next/navigation"
import { type Cidade, ufDe } from "@/domain/localidade/uf"
import { container } from "@/infrastructure/container"

/** A cidade do endereço, ou null quando a UF ou a cidade não existem (o cabeçalho usa esta, sem 404: RN-230). */
export function cidadeDoEnderecoOuNada(ufParam: string, cidadeParam: string): Cidade | null {
  const uf = ufDe(ufParam)
  // Só a forma minúscula vale (/df/…), para não haver dois endereços para a mesma página.
  if (!uf || ufParam !== uf.toLowerCase()) return null
  let slug: string
  try {
    slug = decodeURIComponent(cidadeParam)
  } catch {
    return null
  }
  return container().localidades.cidadePorSlug(uf, slug) ?? null
}

export function cidadeDoEndereco(ufParam: string, cidadeParam: string): Cidade {
  const cidade = cidadeDoEnderecoOuNada(ufParam, cidadeParam)
  if (!cidade) notFound()
  return cidade
}
