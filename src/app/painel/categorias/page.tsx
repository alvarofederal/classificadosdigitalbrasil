// APRESENTAÇÃO — cadastro de categorias (seções do caderno) — RF-30.

import type { Metadata } from "next"
import { Faixa } from "@/components/jornal/pecas"
import { container } from "@/infrastructure/container"
import { LinhaCategoria, NovaCategoria } from "./formularios-categoria"

export const metadata: Metadata = { title: "Categorias", robots: { index: false } }

export default async function Categorias() {
  const categorias = await container().painel.categorias()
  const proximaOrdem = categorias.reduce((max, c) => Math.max(max, c.ordem), 0) + 10

  return (
    <div className="flex flex-col gap-5">
      <Faixa como="h1">Categorias ({categorias.length})</Faixa>
      <p className="text-sm">
        A ordem define a sequência das seções no site. Categoria com anúncios não pode ser excluída: desative-a para sumir dos filtros e do
        cadastro de novos anúncios.
      </p>
      <NovaCategoria proximaOrdem={proximaOrdem} />
      <ul>
        {categorias.map((categoria) => (
          <LinhaCategoria key={`${categoria.id}-${categoria.nome}-${categoria.ordem}-${categoria.ativa}`} categoria={categoria} />
        ))}
      </ul>
    </div>
  )
}
