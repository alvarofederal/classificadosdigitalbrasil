// APRESENTAÇÃO — tabela de planos da capa (RF-45). Os valores vêm do painel (Painel → Planos).

import { Check } from "lucide-react"
import Link from "next/link"
import { type Plano, RECURSOS_DO_PLANO } from "@/domain/plano/plano"
import { formatarReais } from "@/lib/formatadores"
import { vantagensDoPlano } from "@/lib/planos"
import { cn } from "@/lib/utils"

export function TabelaDePrecos({ planos }: { planos: Plano[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {planos.map((plano) => {
        const recursos = RECURSOS_DO_PLANO[plano.codigo]
        return (
          <div key={plano.codigo} className={cn("flex flex-col bg-white p-4", recursos.destaque ? "border-[3px] border-double border-tinta" : "border border-tinta")}>
            <p className={cn("font-titulo text-lg font-bold uppercase", recursos.vitrine && "-mx-1 bg-tinta px-1 text-white")}>{plano.nome}</p>
            <p className="mt-1 text-sm leading-snug">{plano.descricao}</p>
            <dl className="mt-3 grid grid-cols-2 gap-2 border-y border-tinta py-2 text-center">
              <div>
                <dt className="font-titulo text-[0.65rem] uppercase tracking-wider text-tinta-suave">7 dias</dt>
                <dd className="font-manchete text-2xl">{formatarReais(plano.valor7DiasCentavos)}</dd>
              </div>
              <div>
                <dt className="font-titulo text-[0.65rem] uppercase tracking-wider text-tinta-suave">30 dias</dt>
                <dd className="font-manchete text-2xl">{formatarReais(plano.valor30DiasCentavos)}</dd>
              </div>
            </dl>
            <ul className="mt-3 flex flex-1 flex-col gap-1 text-sm">
              {vantagensDoPlano(plano).map((v) => (
                <li key={v} className="flex items-start gap-1.5">
                  <Check className="mt-0.5 size-4 shrink-0" aria-hidden />
                  {v}
                </li>
              ))}
            </ul>
            <Link href="/minha-conta/anuncios/novo" className={cn("botao botao-pequeno mt-4", !recursos.destaque && "botao-vazado")}>
              Anunciar no {plano.nome}
            </Link>
          </div>
        )
      })}
    </div>
  )
}
