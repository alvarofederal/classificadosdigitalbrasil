// APRESENTAÇÃO — lugar da página do anúncio: a cidade do anúncio (feature 023: RF-231, RN-230).
// A busca é a mesma da página, com cache do React: não faz consulta a mais.

import { lugarDoCabecalho } from "@/lib/cabecalho"
import { buscarAnuncio } from "../../../anuncio/[codigo]/buscar"

export default async function LugarDoAnuncio({ params }: { params: Promise<{ codigo: string }> }) {
  const achado = await buscarAnuncio((await params).codigo)
  return lugarDoCabecalho(achado?.cidade)
}
