"use client"

// APRESENTAÇÃO — escolha de plano e período com o valor à vista (feature 003: RF-52).

import { type Plano, type Periodo, PERIODOS, RECURSOS_DO_PLANO, valorDoPeriodo } from "@/domain/plano/plano"
import { formatarReais } from "@/lib/formatadores"
import { vantagensDoPlano } from "@/lib/planos"
import { cn } from "@/lib/utils"

export function EscolhaDePlano({
  planos,
  plano,
  dias,
  aoMudarPlano,
  aoMudarDias,
  erroPlano,
  erroDias,
}: {
  planos: Plano[]
  plano: string
  dias: Periodo
  aoMudarPlano: (codigo: string) => void
  aoMudarDias: (dias: Periodo) => void
  erroPlano?: string
  erroDias?: string
}) {
  const escolhido = planos.find((p) => p.codigo === plano)
  return (
    <fieldset className="flex flex-col gap-3 border border-fio p-4">
      <legend className="rotulo px-1">Plano e período</legend>
      <input type="hidden" name="planoCodigo" value={plano} />
      <input type="hidden" name="dias" value={dias} />

      <div role="radiogroup" aria-label="Período" className="flex gap-2">
        {PERIODOS.map((p) => (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={dias === p}
            onClick={() => aoMudarDias(p)}
            className={cn("flex-1 border px-3 py-2 font-titulo text-sm font-semibold uppercase", dias === p ? "border-tinta bg-tinta text-white" : "border-fio hover:bg-papel-escuro")}
          >
            {p} dias
          </button>
        ))}
      </div>
      {erroDias && <p className="text-sm text-perigo">{erroDias}</p>}

      <div role="radiogroup" aria-label="Plano" className="grid gap-2 sm:grid-cols-2">
        {planos.map((p) => {
          const ativo = p.codigo === plano
          return (
            <button
              key={p.codigo}
              type="button"
              role="radio"
              aria-checked={ativo}
              onClick={() => aoMudarPlano(p.codigo)}
              className={cn(
                "flex flex-col items-start gap-0.5 border p-3 text-left",
                ativo ? "border-tinta bg-tinta text-white" : "border-fio hover:bg-papel-escuro",
                RECURSOS_DO_PLANO[p.codigo].destaque && !ativo && "border-[3px] border-double",
              )}
            >
              <span className="flex w-full items-baseline justify-between gap-2">
                <span className="font-titulo font-bold uppercase">{p.nome}</span>
                <span className="font-manchete text-xl">{formatarReais(valorDoPeriodo(p, dias))}</span>
              </span>
              <span className={cn("text-xs leading-snug", ativo ? "text-white/85" : "text-tinta-suave")}>{vantagensDoPlano(p).join(" · ")}</span>
            </button>
          )
        })}
      </div>
      {erroPlano && <p className="text-sm text-perigo">{erroPlano}</p>}
      {escolhido && (
        <p className="text-sm">
          Total: <strong>{formatarReais(valorDoPeriodo(escolhido, dias))}</strong> por {dias} dias no plano {escolhido.nome}.
        </p>
      )}
    </fieldset>
  )
}
