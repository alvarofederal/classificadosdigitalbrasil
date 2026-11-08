// APRESENTAÇÃO — o cabeçalho do jornal: a manchete CLASSIFICADOS ocupando a largura, como na página impressa.

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
    <header className="mx-auto w-full max-w-[1400px] px-3 pt-2 sm:px-4">
      <nav className="flex items-center justify-between gap-3 font-titulo text-[0.7rem] uppercase tracking-wider sm:text-xs" aria-label="Conta">
        <span className="hidden sm:inline">{dataPorExtenso(agora)}</span>
        <div className="ml-auto flex items-center gap-3 sm:gap-5">
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
              <Link href="/cadastro" className="hover:underline">
                Criar conta
              </Link>
            </>
          )}
        </div>
      </nav>

      <Link href="/" className="block text-center" aria-label="Classificados Digitais do Brasil, capa">
        <span
          className={cn(
            "block font-manchete uppercase leading-[0.82] tracking-[-0.01em]",
            compacto ? "pb-1 pt-2 text-[clamp(2.6rem,10vw,5.5rem)]" : "pb-1 pt-2 text-[clamp(3.4rem,15.2vw,13.5rem)]",
          )}
        >
          Classificados
        </span>
      </Link>
      <div className="flex items-center justify-between gap-2 border-y border-tinta py-0.5 font-titulo text-[0.62rem] font-semibold uppercase tracking-[0.18em] sm:text-[0.7rem]">
        <span>Digitais do Brasil</span>
        <span className="text-right">Anúncio {preco}</span>
      </div>
    </header>
  )
}
