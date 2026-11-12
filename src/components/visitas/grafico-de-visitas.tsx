"use client"

// APRESENTAÇÃO — barras de visitas por dia, na cor da tinta (feature 013: RF-131, RF-132).
// Passar o dedo ou o mouse numa coluna, ou usar as setas com o gráfico em foco, mostra o dia, as visitas e as pessoas.

import { useId, useState } from "react"
import type { VisitasDoDia } from "@/domain/anuncio/visitas"
import { cn } from "@/lib/utils"

const NUMERO = new Intl.NumberFormat("pt-BR")
const contar = (n: number, um: string, varios: string) => `${NUMERO.format(n)} ${n === 1 ? um : varios}`
const diaEMes = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`

interface Props {
  dias: VisitasDoDia[]
  maiorDia: number
  /** Altura da área das barras, em pixels. */
  altura: number
  /** O nome do gráfico para quem usa leitor de tela. */
  rotulo: string
  /** Mostra as pessoas na leitura do dia (falso sem o segredo, RN-135). */
  comPessoas: boolean
  /** Datas embaixo do gráfico: o primeiro dia e hoje. */
  comDatas?: boolean
}

export function GraficoDeVisitas({ dias, maiorDia, altura, rotulo, comPessoas, comDatas = false }: Props) {
  const [ativo, setAtivo] = useState<number | null>(null)
  const idDaLeitura = useId()
  const ultimo = dias.length - 1
  const escala = Math.max(maiorDia, 1)
  const nomeDoDia = (i: number) => (i === ultimo ? "Hoje" : diaEMes(dias[i].dia))
  const dia = ativo === null ? null : dias[ativo]

  // A leitura fica acima da coluna; perto das pontas, encosta na borda para não sair do cartão.
  const posicao = ativo === null ? {} : ativo < dias.length / 4 ? { left: 0 } : ativo > (dias.length * 3) / 4 ? { right: 0 } : { left: `${((ativo + 0.5) / dias.length) * 100}%`, transform: "translateX(-50%)" }

  function teclado(evento: React.KeyboardEvent) {
    const passos: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 }
    if (evento.key in passos) setAtivo((a) => Math.min(ultimo, Math.max(0, (a ?? ultimo) + passos[evento.key])))
    else if (evento.key === "Home") setAtivo(0)
    else if (evento.key === "End") setAtivo(ultimo)
    else return
    evento.preventDefault()
  }

  return (
    <div className="relative">
      <div
        role="group"
        aria-label={`${rotulo}. Use as setas para ler cada dia.`}
        aria-describedby={idDaLeitura}
        tabIndex={0}
        onKeyDown={teclado}
        onFocus={() => setAtivo((a) => a ?? ultimo)}
        onBlur={() => setAtivo(null)}
        onPointerLeave={() => setAtivo(null)}
        className="flex items-end gap-[2px] border-b border-fio/30 outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-tinta"
        style={{ height: altura }}
      >
        {dias.map((d, i) => (
          // A coluna inteira é a área de toque, maior que a barra.
          <div key={d.dia} aria-hidden className="flex h-full min-w-0 flex-1 items-end justify-center" onPointerEnter={() => setAtivo(i)} onPointerDown={() => setAtivo(i)}>
            <span
              className={cn("block w-full max-w-6 rounded-t-[4px] bg-tinta transition-opacity", ativo !== null && ativo !== i && "opacity-40")}
              style={{ height: d.visitas > 0 ? `max(2px, ${(d.visitas / escala) * 100}%)` : 0 }}
            />
          </div>
        ))}
      </div>
      <p
        id={idDaLeitura}
        aria-live="polite"
        className={cn(
          "pointer-events-none absolute bottom-full z-10 mb-1.5 whitespace-nowrap border border-fio bg-papel px-2 py-1 text-xs leading-tight shadow-sm",
          !dia && "sr-only",
        )}
        style={posicao}
      >
        {dia && ativo !== null ? (
          <>
            <span className="font-titulo uppercase tracking-wider text-tinta-suave">{nomeDoDia(ativo)}</span>{" "}
            <strong>{NUMERO.format(dia.visitas)}</strong> {dia.visitas === 1 ? "visita" : "visitas"}
            {comPessoas && <> · {contar(dia.pessoas, "pessoa", "pessoas")}</>}
          </>
        ) : null}
      </p>
      {comDatas && (
        <div className="mt-1 flex justify-between font-titulo text-[11px] uppercase tracking-wider text-tinta-suave" aria-hidden>
          <span>{diaEMes(dias[0].dia)}</span>
          <span>Hoje</span>
        </div>
      )}
    </div>
  )
}
