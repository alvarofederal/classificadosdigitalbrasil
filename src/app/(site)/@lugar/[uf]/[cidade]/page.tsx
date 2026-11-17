// APRESENTAÇÃO — lugar da página da cidade: "Brasília · DF" (feature 023: RF-231, RN-230).
// Cidade que não existe não manda para o 404 daqui; quem decide isso é a página.

import { lugarDoCabecalho } from "@/lib/cabecalho"
import { cidadeDoEnderecoOuNada } from "../../../localizar"

export default async function LugarDaCidade({ params }: { params: Promise<{ uf: string; cidade: string }> }) {
  const { uf, cidade } = await params
  return lugarDoCabecalho(cidadeDoEnderecoOuNada(uf, cidade))
}
