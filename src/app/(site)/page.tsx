// APRESENTAÇÃO — capa limpa (feature 002, revisão de 2026-11-09): só a manchete e o filtro Estado → Cidade → Seção.
// Funcionamento, preços e contato ficam na página de divulgação /como-funciona (link no cabeçalho e no rodapé).

import { Filtros } from "@/components/jornal/filtros"
import { PertoDeMim } from "@/components/jornal/perto-de-mim"
import { container } from "@/infrastructure/container"

export default async function Capa() {
  const secoes = await container().classificados.categoriasAtivas()

  return (
    <section aria-labelledby="titulo-busca" className="mx-auto flex min-h-[45dvh] w-full max-w-4xl flex-col justify-center gap-5 py-10">
      <h1 id="titulo-busca" className="text-center font-titulo text-xl font-bold uppercase tracking-wide sm:text-2xl">
        Encontre os classificados da sua cidade
      </h1>
      <Filtros secoes={secoes.map(({ id, nome, slug }) => ({ id, nome, slug }))} />
      <div className="flex justify-center">
        <PertoDeMim discreto />
      </div>
    </section>
  )
}
