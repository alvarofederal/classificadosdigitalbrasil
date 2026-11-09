// APRESENTAÇÃO — tabela de valores (RF-45): planos nas linhas, períodos nas colunas (feature 009). Valores vêm do painel.

import { Check } from "lucide-react"
import Link from "next/link"
import { PERIODOS, type Plano, RECURSOS_DO_PLANO, periodosDoPlano, valorDoPeriodo } from "@/domain/plano/plano"
import { formatarReais } from "@/lib/formatadores"
import { vantagensDoPlano } from "@/lib/planos"
import { cn } from "@/lib/utils"

export function TabelaDePrecos({ planos }: { planos: Plano[] }) {
  // Só as colunas que algum plano vende.
  const periodos = PERIODOS.filter((dias) => planos.some((p) => valorDoPeriodo(p, dias) !== null))

  return (
    <div className="flex flex-col gap-5">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse border-2 border-tinta text-center">
          <caption className="sr-only">Valores por plano e período</caption>
          <thead>
            <tr className="bg-tinta text-white">
              <th scope="col" className="px-3 py-2 text-left font-titulo text-sm uppercase tracking-wide">
                Plano
              </th>
              {periodos.map((dias) => (
                <th key={dias} scope="col" className="px-3 py-2 font-titulo text-sm uppercase tracking-wide">
                  {dias} dias
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {planos.map((plano) => (
              <tr key={plano.codigo} className="border-t border-tinta">
                <th scope="row" className="px-3 py-3 text-left align-top">
                  <span className="block font-titulo text-lg font-bold uppercase">{plano.nome}</span>
                  <span className="block text-xs font-normal text-tinta-suave">{plano.maxFotos === 0 ? "sem foto" : `até ${plano.maxFotos} fotos`}</span>
                </th>
                {periodos.map((dias) => {
                  const valor = valorDoPeriodo(plano, dias)
                  return (
                    <td key={dias} className="px-3 py-3 font-manchete text-xl sm:text-2xl">
                      {valor === null ? <span className="font-texto text-base text-tinta-suave">—</span> : formatarReais(valor)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {planos.map((plano) => {
          const recursos = RECURSOS_DO_PLANO[plano.codigo]
          const primeiro = periodosDoPlano(plano)[0]
          return (
            <div key={plano.codigo} className={cn("flex flex-col bg-white p-4", recursos.destaque ? "border-[3px] border-double border-tinta" : "border border-tinta")}>
              <p className="font-titulo text-lg font-bold uppercase">{plano.nome}</p>
              <p className="mt-1 text-sm leading-snug">{plano.descricao}</p>
              <ul className="mt-3 flex flex-1 flex-col gap-1 text-sm">
                {vantagensDoPlano(plano).map((v) => (
                  <li key={v} className="flex items-start gap-1.5">
                    <Check className="mt-0.5 size-4 shrink-0" aria-hidden />
                    {v}
                  </li>
                ))}
              </ul>
              <Link href={`/minha-conta/anuncios/novo?plano=${plano.codigo}`} className="botao botao-pequeno mt-4">
                Anunciar no {plano.nome}
                {primeiro && ` · a partir de ${formatarReais(valorDoPeriodo(plano, primeiro)!)}`}
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
