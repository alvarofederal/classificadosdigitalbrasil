// APRESENTAÇÃO — resolve os segmentos do endereço (/df/brasilia/veiculos) em UF, cidade e seção.

import { notFound } from "next/navigation"
import { type Cidade, ufDe } from "@/domain/localidade/uf"
import { container } from "@/infrastructure/container"

export function cidadeDoEndereco(ufParam: string, cidadeParam: string): Cidade {
  const uf = ufDe(ufParam)
  // Só a forma minúscula vale (/df/…), para não haver dois endereços para a mesma página.
  if (!uf || ufParam !== uf.toLowerCase()) notFound()
  const cidade = container().localidades.cidadePorSlug(uf, decodeURIComponent(cidadeParam))
  if (!cidade) notFound()
  return cidade
}
