"use client"

// APRESENTAÇÃO — escolha de plano e período com o valor à vista (features 003 e 009: RF-52, RN-56) e, para quem tem saldo,
// a escolha entre Pix e dias do banco (feature 017: RF-172, RF-173; RN-171, RN-172).

import { useEffect, useState } from "react"
import { MINIMO_PARA_PUBLICAR, NOMES_DOS_TIPOS_DE_DIA, type SaldoDoBanco, TIPOS_DE_DIA, type TipoDeDia, diasPorExtenso, totalDeDias } from "@/domain/banco/banco-de-dias"
import { type Periodo, type Plano, RECURSOS_DO_PLANO, periodosDoPlano, valorDoPeriodo } from "@/domain/plano/plano"
import { formatarReais } from "@/lib/formatadores"
import { NOMES_DOS_PLANOS, vantagensDoPlano } from "@/lib/planos"
import { cn } from "@/lib/utils"

export type FormaDePagamento = "PIX" | "BANCO"

export function EscolhaDePlano({
  planos,
  plano,
  dias,
  aoMudarPlano,
  aoMudarDias,
  erroPlano,
  erroDias,
  banco,
  prazoAtual,
  aoMudarForma,
}: {
  planos: Plano[]
  plano: string
  dias: Periodo
  aoMudarPlano: (codigo: string) => void
  aoMudarDias: (dias: Periodo) => void
  erroPlano?: string
  erroDias?: string
  /** Saldo do banco de dias; sem ele (ou zerado), só o Pix. */
  banco?: SaldoDoBanco
  /** Anúncio ainda em prazo (no ar ou desativado): aceita a partir de 1 dia, e Com foto só recebe dias com foto (RN-171, RN-172). */
  prazoAtual?: { planoCodigo: string } | null
  aoMudarForma?: (forma: FormaDePagamento) => void
}) {
  const minimo = prazoAtual ? 1 : MINIMO_PARA_PUBLICAR
  const tiposQueServem = banco ? TIPOS_DE_DIA.filter((t) => banco[t] >= minimo && !(prazoAtual?.planoCodigo === "FOTOS" && t === "SIMPLES")) : []
  const [forma, setForma] = useState<FormaDePagamento>(tiposQueServem.length > 0 ? "BANCO" : "PIX")
  const [tipo, setTipo] = useState<TipoDeDia>(tiposQueServem.includes(plano as TipoDeDia) ? (plano as TipoDeDia) : (tiposQueServem[0] ?? "SIMPLES"))
  const [diasDoBanco, setDiasDoBanco] = useState(() => (banco ? Math.min(Math.max(minimo, 7), banco[tipo]) : 7))

  function mudarForma(nova: FormaDePagamento) {
    setForma(nova)
  }

  function mudarTipo(novo: TipoDeDia) {
    setTipo(novo)
    if (banco) setDiasDoBanco((atual) => Math.min(Math.max(atual, minimo), banco[novo]))
  }

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

  const usandoBanco = forma === "BANCO" && banco !== undefined && tiposQueServem.length > 0
  // Quem usa o componente (o botão do formulário) acompanha a forma que vale de fato.
  useEffect(() => {
    aoMudarForma?.(usandoBanco ? "BANCO" : "PIX")
  }, [usandoBanco, aoMudarForma])

  return (
    <fieldset className="flex flex-col gap-3 border border-fio p-4">
      <legend className="rotulo px-1">{usandoBanco ? "Dias do banco" : "Plano e período"}</legend>
      <input type="hidden" name="forma" value={usandoBanco ? "BANCO" : "PIX"} />
      <input type="hidden" name="planoCodigo" value={usandoBanco ? tipo : plano} />
      <input type="hidden" name="dias" value={usandoBanco ? diasDoBanco : dias} />

      {banco && totalDeDias(banco) > 0 && (
        <div role="radiogroup" aria-label="Como pagar" className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ["BANCO", "Usar dias do banco", `Você tem ${diasPorExtenso(banco.SIMPLES, "SIMPLES")} e ${diasPorExtenso(banco.FOTOS, "FOTOS")}.`],
              ["PIX", "Pagar com Pix", "Escolha o plano e o período; o anúncio entra no caderno quando o Pix for pago."],
            ] as const
          ).map(([valorForma, titulo, explicacao]) => {
            const desabilitado = valorForma === "BANCO" && tiposQueServem.length === 0
            const ativo = (valorForma === "BANCO") === usandoBanco
            return (
              <button
                key={valorForma}
                type="button"
                role="radio"
                aria-checked={ativo}
                disabled={desabilitado}
                onClick={() => mudarForma(valorForma)}
                className={cn(
                  "flex flex-col items-start gap-0.5 border p-3 text-left disabled:opacity-60",
                  ativo ? "border-tinta bg-tinta text-white" : "border-fio hover:bg-papel-escuro",
                )}
              >
                <span className="font-titulo font-bold uppercase">{titulo}</span>
                <span className={cn("text-xs leading-snug", ativo ? "text-white/85" : "text-tinta-suave")}>{explicacao}</span>
              </button>
            )
          })}
        </div>
      )}
      {banco && totalDeDias(banco) > 0 && tiposQueServem.length === 0 && (
        <p className="text-sm">
          {prazoAtual?.planoCodigo === "FOTOS" && banco.FOTOS === 0
            ? "Este anúncio está no plano Com foto e só recebe dias com foto."
            : `Para pôr o anúncio no caderno com dias do banco, são precisos pelo menos ${MINIMO_PARA_PUBLICAR} dias do mesmo tipo.`}
        </p>
      )}

      {usandoBanco ? (
        <>
          <div role="radiogroup" aria-label="Tipo de dia" className="grid gap-2 sm:grid-cols-2">
            {tiposQueServem.map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={tipo === t}
                onClick={() => mudarTipo(t)}
                className={cn("flex flex-col items-start gap-0.5 border p-3 text-left", tipo === t ? "border-tinta bg-tinta text-white" : "border-fio hover:bg-papel-escuro")}
              >
                <span className="font-titulo font-bold uppercase">{NOMES_DOS_TIPOS_DE_DIA[t].plural}</span>
                <span className={cn("text-xs leading-snug", tipo === t ? "text-white/85" : "text-tinta-suave")}>
                  Plano {NOMES_DOS_PLANOS[t]} · você tem {banco[t]}
                </span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="rotulo">Quantos dias usar</span>
              <input
                type="number"
                inputMode="numeric"
                className="campo w-28"
                min={minimo}
                max={banco[tipo]}
                value={diasDoBanco}
                onChange={(e) => setDiasDoBanco(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                aria-invalid={erroDias ? true : undefined}
              />
            </label>
            {banco[tipo] !== diasDoBanco && (
              <button type="button" className="botao botao-vazado botao-pequeno" onClick={() => setDiasDoBanco(banco[tipo])}>
                Usar todos ({banco[tipo]})
              </button>
            )}
          </div>
          {erroDias && <p className="text-sm text-perigo">{erroDias}</p>}
          {erroPlano && <p className="text-sm text-perigo">{erroPlano}</p>}
          <p className="text-sm">
            {prazoAtual ? "O anúncio ganha mais" : "O anúncio fica"}{" "}
            <strong>
              {diasDoBanco} {diasDoBanco === 1 ? "dia" : "dias"}
            </strong>{" "}
            no caderno, no plano {NOMES_DOS_PLANOS[tipo]}, sem pagar nada. Ficam {diasPorExtenso(Math.max(0, banco[tipo] - diasDoBanco), tipo)} no banco.
          </p>
        </>
      ) : (
        <>
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

          <div role="radiogroup" aria-label="Período" className="grid grid-cols-3 gap-2">
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
        </>
      )}
    </fieldset>
  )
}
