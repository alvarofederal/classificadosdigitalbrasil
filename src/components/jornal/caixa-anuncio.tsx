// APRESENTAÇÃO — o quadrado do anúncio, igual no caderno, na prévia do editor e na página do anúncio.
// Formatação dinâmica (moldura, título, alinhamento, estrelas) sempre na mesma cor de tinta.

import type { ReactNode } from "react"
import type { EstiloDoAnuncio } from "@/domain/anuncio/anuncio"
import { formatarReais } from "@/lib/formatadores"
import { cn } from "@/lib/utils"

export interface ConteudoDaCaixa {
  titulo: string
  texto: string
  precoCentavos: number | null
  estilo: EstiloDoAnuncio
}

const MOLDURA: Record<EstiloDoAnuncio["moldura"], string> = {
  NENHUMA: "border-y border-tinta/30",
  SIMPLES: "border border-tinta",
  DUPLA: "border-[4px] border-double border-tinta",
  TRACEJADA: "border-[1.5px] border-dashed border-tinta",
}

function Estrelas() {
  return (
    <p aria-hidden className="select-none text-center text-[0.7rem] leading-none tracking-[0.5em]">
      ★ ★ ★ ★
    </p>
  )
}

export function CaixaAnuncio({
  conteudo,
  rodape,
  grande = false,
  className,
}: {
  conteudo: ConteudoDaCaixa
  /** Botões de mensagem e álbum (interativos no site, ilustrativos na prévia). */
  rodape?: ReactNode
  grande?: boolean
  className?: string
}) {
  const { titulo, texto, precoCentavos, estilo } = conteudo
  const centro = estilo.alinhamento === "CENTRO"

  return (
    <article className={cn("bg-papel-claro px-3 py-2.5", MOLDURA[estilo.moldura], centro ? "text-center" : "text-left", className)}>
      {estilo.estrelas && <Estrelas />}
      <h3
        className={cn(
          "font-titulo font-bold uppercase leading-tight tracking-wide break-words",
          grande ? "text-2xl" : "text-[1.05rem]",
          estilo.estrelas && "mt-1.5",
          estilo.estiloTitulo === "TARJA" && "-mx-1 bg-tinta px-1.5 py-0.5 text-papel",
          estilo.estiloTitulo === "SUBLINHADO" && "border-b-2 border-tinta pb-0.5",
        )}
      >
        {titulo || "TÍTULO DO ANÚNCIO"}
      </h3>
      <p className={cn("mt-1.5 whitespace-pre-line break-words leading-snug", grande ? "text-lg" : "text-[0.92rem]")}>
        {texto || "O texto do seu anúncio aparece aqui, do jeito que vai sair no caderno."}
      </p>
      {precoCentavos !== null && (
        <p className={cn("mt-1.5 font-titulo font-bold", grande ? "text-xl" : "text-base")}>{formatarReais(precoCentavos)}</p>
      )}
      {estilo.estrelas && (
        <div className="mt-1.5">
          <Estrelas />
        </div>
      )}
      {rodape && <div className="mt-2 border-t border-dotted border-tinta/60 pt-1.5">{rodape}</div>}
    </article>
  )
}
