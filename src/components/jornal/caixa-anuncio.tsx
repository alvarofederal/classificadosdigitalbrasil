// APRESENTAÇÃO — o anúncio do caderno, igual na página, na prévia do editor e na página do anúncio.
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
  NENHUMA: "border-b border-tinta",
  SIMPLES: "border border-tinta",
  DUPLA: "border-[3px] border-double border-tinta",
  TRACEJADA: "border border-dashed border-tinta",
}

function Estrelas({ grande }: { grande?: boolean }) {
  return (
    <p aria-hidden className={cn("select-none text-center leading-none tracking-[0.45em]", grande ? "text-sm" : "text-[0.6rem]")}>
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
  /** Ícones de mensagem e álbum (interativos no site, ilustrativos na prévia). */
  rodape?: ReactNode
  /** Página do anúncio: mesma caixa, letra maior. */
  grande?: boolean
  className?: string
}) {
  const { titulo, texto, precoCentavos, estilo } = conteudo
  const centro = estilo.alinhamento === "CENTRO"

  return (
    <article className={cn("bg-white", grande ? "px-4 py-3" : "px-2 py-1.5", MOLDURA[estilo.moldura], centro ? "text-center" : "text-left", className)}>
      {estilo.estrelas && <Estrelas grande={grande} />}
      <h3
        className={cn(
          "font-titulo font-bold uppercase leading-[1.1] break-words",
          grande ? "text-2xl" : "text-[0.82rem] tracking-[0.01em]",
          estilo.estrelas && "mt-1",
          estilo.estiloTitulo === "TARJA" && (grande ? "-mx-1 bg-tinta px-2 py-1 text-white" : "-mx-0.5 bg-tinta px-1 py-[2px] text-white"),
          estilo.estiloTitulo === "SUBLINHADO" && "border-b border-tinta pb-[2px]",
        )}
      >
        {titulo || "TÍTULO DO ANÚNCIO"}
      </h3>
      <p className={cn("whitespace-pre-line break-words", grande ? "mt-2 text-lg leading-snug" : "mt-0.5 text-[0.74rem] leading-[1.28]")}>
        {texto || "O texto do seu anúncio aparece aqui, do jeito que vai sair no caderno."}
      </p>
      {precoCentavos !== null && (
        <p className={cn("font-titulo font-bold", grande ? "mt-2 text-xl" : "mt-0.5 text-[0.8rem]")}>{formatarReais(precoCentavos)}</p>
      )}
      {estilo.estrelas && (
        <div className={grande ? "mt-2" : "mt-1"}>
          <Estrelas grande={grande} />
        </div>
      )}
      {rodape && <div className={cn("border-t border-dotted border-tinta/70", grande ? "mt-3 pt-2" : "mt-1 pt-0.5")}>{rodape}</div>}
    </article>
  )
}
