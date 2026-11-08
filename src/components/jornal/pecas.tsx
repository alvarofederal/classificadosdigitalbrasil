// APRESENTAÇÃO — peças pequenas do caderno: faixa de seção, paginação e rodapé.

import Link from "next/link"
import type { ReactNode } from "react"
import { NOME_DO_SITE } from "@/lib/site"
import { cn } from "@/lib/utils"

export function Faixa({ children, como: Tag = "h2", className }: { children: ReactNode; como?: "h1" | "h2" | "h3"; className?: string }) {
  return <Tag className={cn("faixa px-3 py-1.5 text-lg sm:text-xl", className)}>{children}</Tag>
}

export function Paginacao({ pagina, total, porPagina, endereco }: { pagina: number; total: number; porPagina: number; endereco: (pagina: number) => string }) {
  const paginas = Math.max(1, Math.ceil(total / porPagina))
  if (paginas <= 1) return null
  return (
    <nav className="mt-6 flex items-center justify-center gap-2 font-titulo text-sm uppercase" aria-label="Páginas">
      {pagina > 1 ? (
        <Link href={endereco(pagina - 1)} className="botao botao-vazado botao-pequeno">
          ← Anterior
        </Link>
      ) : (
        <span className="botao botao-vazado botao-pequeno pointer-events-none opacity-40">← Anterior</span>
      )}
      <span className="px-2">
        Página {pagina} de {paginas}
      </span>
      {pagina < paginas ? (
        <Link href={endereco(pagina + 1)} className="botao botao-vazado botao-pequeno">
          Próxima →
        </Link>
      ) : (
        <span className="botao botao-vazado botao-pequeno pointer-events-none opacity-40">Próxima →</span>
      )}
    </nav>
  )
}

export function Rodape() {
  return (
    <footer className="mx-auto mt-12 w-full max-w-7xl px-4 pb-8">
      <div className="fio-duplo" />
      <div className="flex flex-col items-center justify-between gap-2 py-3 text-center font-titulo text-xs uppercase tracking-wider sm:flex-row sm:text-left">
        <span>{NOME_DO_SITE}</span>
        <nav className="flex gap-4" aria-label="Institucional">
          <Link href="/termos" className="hover:underline">
            Termos de uso
          </Link>
          <Link href="/termos#privacidade" className="hover:underline">
            Privacidade
          </Link>
          <Link href="/minha-conta/anuncios/novo" className="hover:underline">
            Anunciar
          </Link>
        </nav>
      </div>
    </footer>
  )
}
