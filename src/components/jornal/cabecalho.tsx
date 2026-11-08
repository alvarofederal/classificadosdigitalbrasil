// APRESENTAÇÃO — o cabeçalho do jornal: nome do caderno, linha de data e o preço do espaço.

import Link from "next/link"
import { container } from "@/infrastructure/container"
import { dataPorExtenso, formatarReais, plural } from "@/lib/formatadores"
import { usuarioAtual } from "@/lib/sessao"
import { cn } from "@/lib/utils"

export async function Cabecalho({ compacto = false }: { compacto?: boolean }) {
  const [usuario, tabela] = await Promise.all([usuarioAtual(), container().configuracao.obter().catch(() => null)])
  const agora = container().relogio.agora()
  const preco = tabela ? `${formatarReais(tabela.valorAnuncioCentavos)} por ${plural(tabela.diasDePublicacao, "dia", "dias")}` : "R$ 1,00 por 7 dias"
  const areaDoUsuario = usuario ? (usuario.perfil === "ADMIN" ? "/painel" : "/minha-conta") : null

  return (
    <header className="mx-auto w-full max-w-7xl px-4 pt-3">
      <nav className="flex items-center justify-between gap-3 font-titulo text-xs uppercase tracking-wider sm:text-sm" aria-label="Conta">
        <Link href="/" className="hover:underline">
          Capa
        </Link>
        <div className="flex items-center gap-3 sm:gap-5">
          <Link href="/minha-conta/anuncios/novo" className="font-bold hover:underline">
            Anunciar
          </Link>
          {areaDoUsuario ? (
            <Link href={areaDoUsuario} className="hover:underline">
              {usuario?.perfil === "ADMIN" ? "Painel" : "Minha conta"}
            </Link>
          ) : (
            <>
              <Link href="/entrar" className="hover:underline">
                Entrar
              </Link>
              <Link href="/cadastro" className="hidden hover:underline sm:inline">
                Criar conta
              </Link>
            </>
          )}
        </div>
      </nav>

      <div className="fio-grosso mt-2" />
      <Link href="/" className="block text-center" aria-label="Classificados Digitais do Brasil — capa">
        <span
          className={cn(
            "block font-manchete uppercase leading-[0.9] tracking-[0.02em]",
            compacto ? "py-2 text-[clamp(2.4rem,9vw,4.5rem)]" : "py-3 text-[clamp(3rem,13vw,8.5rem)]",
          )}
        >
          Classificados
        </span>
      </Link>
      <div className="fio-duplo" />
      <div className="grid grid-cols-1 items-center gap-1 py-1.5 text-center font-titulo text-[0.7rem] uppercase tracking-[0.12em] sm:grid-cols-3 sm:text-xs">
        <span className="hidden sm:block sm:text-left">{dataPorExtenso(agora)}</span>
        <span className="font-bold tracking-[0.3em]">Digitais do Brasil</span>
        <span className="hidden sm:block sm:text-right">Anúncio: {preco}</span>
      </div>
      <div className="border-t border-fio" />
    </header>
  )
}
