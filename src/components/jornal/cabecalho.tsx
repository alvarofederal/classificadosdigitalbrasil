// APRESENTAÇÃO — o cabeçalho do jornal: a manchete CLASSIFICADOS ocupando a largura, como na página impressa,
// com DIGITAIS DO BRASIL logo abaixo, de ponta a ponta, e o lugar da página na linha fina (feature 023).

import Link from "next/link"
import { container } from "@/infrastructure/container"
import { LINHA_DE_BAIXO, SEM_CIDADE, letrasDaLinha } from "@/lib/cabecalho"
import { dataPorExtenso } from "@/lib/formatadores"
import { precoInicial } from "@/lib/planos"
import { usuarioAtual } from "@/lib/sessao"
import { cn } from "@/lib/utils"

export async function Cabecalho({ compacto = false, lugar }: { compacto?: boolean; lugar?: React.ReactNode }) {
  const [usuario, planos] = await Promise.all([usuarioAtual(), container().classificados.planosAVenda().catch(() => [])])
  const agora = container().relogio.agora()
  const preco = `a partir de ${precoInicial(planos)}`
  const areaDoUsuario = usuario ? (usuario.perfil === "ADMIN" ? "/painel" : "/minha-conta") : null

  return (
    <header className="mx-auto w-full max-w-[1400px] px-3 pt-2 sm:px-4">
      <nav className="flex items-center justify-between gap-3 font-titulo text-[0.7rem] uppercase tracking-wider sm:text-xs" aria-label="Conta">
        <span className="hidden sm:inline">{dataPorExtenso(agora)}</span>
        <div className="ml-auto flex items-center gap-3 sm:gap-5">
          <Link href="/como-funciona" className="hover:underline">
            Como funciona
          </Link>
          <Link href="/como-funciona#valores" className="hidden hover:underline md:inline">
            Valores
          </Link>
          <Link href="/como-funciona#contato" className="hidden hover:underline md:inline">
            Contato
          </Link>
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

      {/* A caixa tem a largura da palavra CLASSIFICADOS; a linha de baixo ocupa essa mesma largura (RF-230).
          A manchete grande tem 75% do tamanho de antes (RF-232): era clamp(3.4rem, 15.2vw, 13.5rem).
          Na capa, que se marca com data-capa, o nome ganha 0,2 em da manchete a mais em cima (RF-233) e a linha da
          cidade desce 0,18 em da manchete, nunca menos de 0,9375 rem (RF-234, RF-235). */}
      <Link href="/" className="mx-auto block w-fit pb-1.5 pt-2" aria-label="Classificados Digitais do Brasil, capa">
        <span
          className={cn(
            "block font-manchete uppercase [body:has([data-capa])_&]:pb-[max(0.18em,0.9375rem)] [body:has([data-capa])_&]:pt-[0.2em]",
            compacto ? "text-[clamp(2.6rem,10vw,5.5rem)]" : "text-[clamp(2.55rem,11.4vw,10.125rem)]",
          )}
        >
          <span className="block leading-[0.82] tracking-[-0.01em]">Classificados</span>
          <LinhaDePontaAPonta texto={LINHA_DE_BAIXO} />
        </span>
      </Link>
      {/* Na capa, mais folga entre os dois fios e o texto (RF-234) e mais espaço até a busca (RF-235). */}
      <div className="flex items-center justify-between gap-2 border-y border-tinta py-0.5 font-titulo [body:has([data-capa])_&]:mb-[max(0.5rem,1.4vw)] [body:has([data-capa])_&]:py-2 text-[0.62rem] font-semibold uppercase tracking-[0.18em] sm:text-[0.7rem]">
        <span>{lugar ?? SEM_CIDADE}</span>
        <span className="text-right">Anúncio {preco}</span>
      </div>
    </header>
  )
}

/**
 * RN-232: as letras de DIGITAIS DO BRASIL espalhadas na largura da manchete, sem JavaScript.
 * O tamanho é uma fração da manchete (em), então as duas linhas crescem e diminuem juntas; o espaço que sobra
 * se divide por igual entre as letras, e o vão entre as palavras soma dois espaços e mais um pouco.
 * O recuo de fora (em da manchete) e o de dentro (em da linha) alinham a tinta, não só a caixa das letras: o desenho
 * do C da Anton começa 0,031 em depois da borda, e o do S termina 0,0094 em antes (0,0194 de folga menos o
 * espaçamento de -0,01 em que vem depois da última letra); o D da Oswald seminegrito começa 0,061 em depois, e o L
 * termina 0,017 em antes. Medido na tinta das fontes carregadas (spec 023, T-261). O espaço de cima deixa 0,06 em
 * da manchete entre o pé de CLASSIFICADOS e o alto de DIGITAIS; na capa, 0,134 em (RF-233).
 */
function LinhaDePontaAPonta({ texto }: { texto: string }) {
  return (
    <span aria-hidden className="mt-[0.046em] block pl-[0.031em] pr-[0.0094em] [body:has([data-capa])_&]:mt-[0.12em]">
      <span className="-ml-[0.061em] -mr-[0.017em] flex justify-between font-titulo font-semibold leading-none tracking-normal text-[length:max(0.2em,0.6rem)]">
        {letrasDaLinha(texto).map((peca, i) =>
          peca.tipo === "vao" ? <span key={i} className="w-[0.5em] shrink-0" /> : <span key={i}>{peca.letra}</span>,
        )}
      </span>
    </span>
  )
}
