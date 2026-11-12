// APRESENTAÇÃO — lista de anúncios do anunciante (RF-11), com as visitas de cada um (feature 013: RF-131).

import type { Metadata } from "next"
import { Images, MessageSquare } from "lucide-react"
import Link from "next/link"
import { CaixaAnuncio } from "@/components/jornal/caixa-anuncio"
import { Faixa } from "@/components/jornal/pecas"
import { VisitasNaLista } from "@/components/visitas/visitas"
import { situacaoExibida } from "@/domain/anuncio/anuncio"
import { planoTemDestaque } from "@/domain/plano/plano"
import { container } from "@/infrastructure/container"
import { diasRestantes, formatarDia, formatarReais, plural } from "@/lib/formatadores"
import { NOMES_DOS_PLANOS } from "@/lib/planos"
import { exigirPerfil } from "@/lib/sessao"
import { SeloSituacao } from "./_componentes/selo-situacao"

export const metadata: Metadata = { title: "Meus anúncios", robots: { index: false } }

export default async function MeusAnuncios({ searchParams }: { searchParams: Promise<{ removido?: string }> }) {
  const usuario = await exigirPerfil("ANUNCIANTE")
  const c = container()
  const agora = c.relogio.agora()
  const anuncios = await c.minhaConta.meusAnuncios(usuario.id)
  const visitas = await c.resumirVisitas.daLista(anuncios.filter((a) => a.publicadoEm !== null))
  const removido = (await searchParams).removido === "1"

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Faixa como="h1" className="flex-1">
          Meus anúncios
        </Faixa>
        <Link href="/minha-conta/anuncios/novo" className="botao">
          Novo anúncio
        </Link>
      </div>
      {removido && <p className="border border-tinta bg-papel-escuro px-3 py-2 text-sm">Anúncio removido do caderno.</p>}

      {anuncios.length === 0 ? (
        <div className="cartao flex flex-col items-start gap-3 p-5">
          <p className="font-titulo text-xl font-bold uppercase">Você ainda não tem anúncios</p>
          <p>Monte o seu vendo a prévia do quadrado. Ele entra no caderno da cidade assim que o Pix for confirmado.</p>
          <Link href="/minha-conta/anuncios/novo" className="botao">
            Criar meu primeiro anúncio
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {anuncios.map((anuncio) => {
            const situacao = situacaoExibida(anuncio.situacao, anuncio.expiraEm, agora)
            const cidade = c.localidades.cidade(anuncio.cidadeCodigo)
            return (
              <li key={anuncio.id} className="cartao flex flex-col gap-3 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <SeloSituacao situacao={situacao} />
                  <span className="font-titulo text-xs uppercase tracking-wider text-tinta-suave">
                    {anuncio.categoriaNome} · {cidade ? `${cidade.nome}/${cidade.uf}` : anuncio.uf} · {NOMES_DOS_PLANOS[anuncio.planoCodigo]}
                  </span>
                </div>
                <Link href={`/minha-conta/anuncios/${anuncio.id}`} className="block hover:opacity-90">
                  <CaixaAnuncio conteudo={anuncio} destaque={planoTemDestaque(anuncio.planoCodigo)} />
                </Link>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  {situacao === "NO_AR" && (
                    <span>
                      No ar até {formatarDia(anuncio.expiraEm)} ({plural(diasRestantes(anuncio.expiraEm, agora), "dia", "dias")})
                    </span>
                  )}
                  {situacao === "EXPIRADO" && <span>Expirou em {formatarDia(anuncio.expiraEm)}</span>}
                  {anuncio.pagamentoPendente && <span className="font-bold">Pix pendente: {formatarReais(anuncio.pagamentoPendente.valorCentavos)}</span>}
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare className="size-4" aria-hidden />
                    {plural(anuncio.totalMensagens, "mensagem", "mensagens")}
                    {anuncio.mensagensNaoLidas > 0 && <strong className="faixa ml-1 px-1.5 text-xs">{anuncio.mensagensNaoLidas} nova(s)</strong>}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Images className="size-4" aria-hidden />
                    {anuncio.fotos.length}
                  </span>
                </div>
                {visitas.has(anuncio.id) && <VisitasNaLista resumo={visitas.get(anuncio.id)!} />}
                <Link href={`/minha-conta/anuncios/${anuncio.id}`} className="botao botao-vazado botao-pequeno self-start">
                  {anuncio.pagamentoPendente ? "Pagar e editar" : situacao === "EXPIRADO" ? "Renovar e editar" : "Abrir"}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
