"use client"

// APRESENTAÇÃO — escolha de plano e período com o valor à vista (features 003 e 009: RF-52, RN-56).

import { type Periodo, type Plano, RECURSOS_DO_PLANO, periodosDoPlano, valorDoPeriodo } from "@/domain/plano/plano"
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
  const periodos = escolhido ? periodosDoPlano(escolhido) : []
  const valor = escolhido ? valorDoPeriodo(escolhido, dias) : null

  function escolherPlano(codigo: string) {
    aoMudarPlano(codigo)
    // Mantém o período se o novo plano também o vende; senão, o primeiro da grade.
    const novo = planos.find((p) => p.codigo === codigo)
    if (novo && valorDoPeriodo(novo, dias) === null) {
      const primeiro = periodosDoPlano(novo)[0]
      if (primeiro) aoMudarDias(primeiro)
    }
  }

  return (
    <fieldset className="flex flex-col gap-3 border border-fio p-4">
      <legend className="rotulo px-1">Plano e período</legend>
      <input type="hidden" name="planoCodigo" value={plano} />
      <input type="hidden" name="dias" value={dias} />

      <div role="radiogroup" aria-label="Plano" className="grid gap-2 sm:grid-cols-2">
        {planos.map((p) => {
          const ativo = p.codigo === plano
          const primeiro = periodosDoPlano(p)[0]
          return (
            <button
              key={p.codigo}
              type="button"
              role="radio"
              aria-checked={ativo}
              onClick={() => escolherPlano(p.codigo)}
              className={cn(
                "flex flex-col items-start gap-0.5 border p-3 text-left",
                ativo ? "border-tinta bg-tinta text-white" : "border-fio hover:bg-papel-escuro",
                RECURSOS_DO_PLANO[p.codigo].destaque && !ativo && "border-[3px] border-double",
              )}
            >
              <span className="flex w-full items-baseline justify-between gap-2">
                <span className="font-titulo font-bold uppercase">{p.nome}</span>
                {primeiro && <span className="font-titulo text-sm">a partir de {formatarReais(valorDoPeriodo(p, primeiro)!)}</span>}
              </span>
              <span className={cn("text-xs leading-snug", ativo ? "text-white/85" : "text-tinta-suave")}>{vantagensDoPlano(p).join(" · ")}</span>
            </button>
          )
        })}
      </div>
      {erroPlano && <p className="text-sm text-perigo">{erroPlano}</p>}

      <div role="radiogroup" aria-label="Período" className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {periodos.map((p) => (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={dias === p}
            onClick={() => aoMudarDias(p)}
            className={cn("flex flex-col items-center border px-2 py-2", dias === p ? "border-tinta bg-tinta text-white" : "border-fio hover:bg-papel-escuro")}
          >
            <span className="font-titulo text-sm font-semibold uppercase">{p} dias</span>
            <span className="font-manchete text-lg">{formatarReais(valorDoPeriodo(escolhido!, p)!)}</span>
          </button>
        ))}
      </div>
      {erroDias && <p className="text-sm text-perigo">{erroDias}</p>}

      {escolhido && valor !== null && (
        <p className="text-sm">
          Total: <strong>{formatarReais(valor)}</strong> por {dias} dias no plano {escolhido.nome}.
        </p>
      )}
    </fieldset>
  )
}
