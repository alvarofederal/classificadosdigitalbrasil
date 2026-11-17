// APRESENTAÇÃO — lista de anúncios do anunciante (RF-11), com as visitas de cada um (feature 013: RF-131), o saldo do banco de dias
// (feature 017: RF-170) e os vencidos à parte, em Expirados, com os prazos da guarda (feature 018: RF-180).

import type { Metadata } from "next"
import { Images, MessageSquare } from "lucide-react"
import Link from "next/link"
import type { MeuAnuncioDTO } from "@/application/queries/consultas"
import { CaixaAnuncio } from "@/components/jornal/caixa-anuncio"
import { Faixa } from "@/components/jornal/pecas"
import { VisitasNaLista } from "@/components/visitas/visitas"
import type { ResumoDeVisitas } from "@/domain/anuncio/visitas"
import { type SituacaoExibida, situacaoExibida } from "@/domain/anuncio/anuncio"
import { DIAS_DAS_MENSAGENS, DIAS_GUARDADO, guardadoAte, mensagensAte, mensagensVencidas } from "@/domain/anuncio/guarda"
import { convitesDisponiveis } from "@/domain/convite/convite"
import { planoTemDestaque } from "@/domain/plano/plano"
import { container } from "@/infrastructure/container"
import { diasRestantes, formatarDia, formatarReais, plural } from "@/lib/formatadores"
import { NOMES_DOS_PLANOS } from "@/lib/planos"
import { exigirPerfil } from "@/lib/sessao"
import { BotaoAtivarDesativar } from "./_componentes/botoes-anuncio"
import { CaixaDeConvites } from "./_componentes/caixa-de-convites"
import { CaixaDoBanco } from "./_componentes/caixa-do-banco"
import { SeloSituacao } from "./_componentes/selo-situacao"

export const metadata: Metadata = { title: "Meus anúncios", robots: { index: false } }

export default async function MeusAnuncios({ searchParams }: { searchParams: Promise<{ removido?: string }> }) {
  const usuario = await exigirPerfil("ANUNCIANTE")
  const c = container()
  const agora = c.relogio.agora()
  const [anuncios, saldo, convites, convitesLigados] = await Promise.all([
    c.minhaConta.meusAnuncios(usuario.id),
    c.minhaConta.saldoDoBanco(usuario.id),
    c.minhaConta.convites(usuario.id),
    c.configuracao.convitesLigados(),
  ])
  const visitas = await c.resumirVisitas.daLista(anuncios.filter((a) => a.publicadoEm !== null))
  const removido = (await searchParams).removido === "1"

  // RF-180: os vencidos vão para Expirados, do que venceu por último para o mais antigo.
  const comSituacao = anuncios.map((anuncio) => ({ anuncio, situacao: situacaoExibida(anuncio.situacao, anuncio.expiraEm, agora) }))
  const emAndamento = comSituacao.filter((a) => a.situacao !== "EXPIRADO")
  const expirados = comSituacao
    .filter((a) => a.situacao === "EXPIRADO")
    .sort((a, b) => (b.anuncio.expiraEm?.getTime() ?? 0) - (a.anuncio.expiraEm?.getTime() ?? 0))
  const cartao = ({ anuncio, situacao }: (typeof comSituacao)[number]) => (
    <CartaoDoAnuncio
      key={anuncio.id}
      anuncio={anuncio}
      situacao={situacao}
      agora={agora}
      cidade={c.localidades.cidade(anuncio.cidadeCodigo)}
      visitas={visitas.get(anuncio.id) ?? null}
    />
  )

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
      {/* Feature 017 (RF-170): o saldo do banco, logo que o anunciante entra. */}
      <CaixaDoBanco saldo={saldo} />
      {/* Feature 015 (RF-250): convites, logo abaixo do banco, onde o prêmio entra. */}
      {convitesLigados && <CaixaDeConvites disponiveis={convitesDisponiveis(convites, agora)} />}

      {anuncios.length === 0 ? (
        <div className="cartao flex flex-col items-start gap-3 p-5">
          <p className="font-titulo text-xl font-bold uppercase">Você ainda não tem anúncios</p>
          <p>Monte o seu vendo a prévia do quadrado. Ele entra no caderno da cidade assim que o Pix for confirmado.</p>
          <Link href="/minha-conta/anuncios/novo" className="botao">
            Criar meu primeiro anúncio
          </Link>
        </div>
      ) : emAndamento.length > 0 ? (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{emAndamento.map(cartao)}</ul>
      ) : (
        <p className="text-sm text-tinta-suave">Nenhum anúncio no caderno agora.</p>
      )}

      {expirados.length > 0 && (
        <section aria-labelledby="titulo-expirados" className="flex flex-col gap-3">
          <h2 id="titulo-expirados" className="border-b-2 border-tinta pb-1 font-titulo text-lg font-bold uppercase">
            Expirados ({expirados.length})
          </h2>
          {/* RN-182 e RN-183 */}
          <p className="text-sm">
            O anúncio vencido fica guardado aqui por {DIAS_GUARDADO} dias. Renovando, ele volta ao caderno com o mesmo texto e as mesmas fotos; depois disso, é
            apagado de vez. As mensagens ficam para leitura por {DIAS_DAS_MENSAGENS} dias depois do vencimento.
          </p>
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{expirados.map(cartao)}</ul>
        </section>
      )}
    </div>
  )
}

function CartaoDoAnuncio({
  anuncio,
  situacao,
  agora,
  cidade,
  visitas,
}: {
  anuncio: MeuAnuncioDTO
  situacao: SituacaoExibida
  agora: Date
  cidade: { nome: string; uf: string } | null
  visitas: ResumoDeVisitas | null
}) {
  return (
    <li className="cartao flex flex-col gap-3 p-3">
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
        {/* RF-180 (RN-182): até quando o vencido fica guardado. */}
        {situacao === "EXPIRADO" && <strong>Guardado até {formatarDia(guardadoAte(anuncio))}</strong>}
        {situacao === "DESATIVADO" && (
          <span>
            Fora do caderno · prazo até {formatarDia(anuncio.expiraEm)} ({plural(diasRestantes(anuncio.expiraEm, agora), "dia", "dias")})
          </span>
        )}
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
        {/* RF-180 (RN-183): até quando as mensagens ficam. */}
        {situacao === "EXPIRADO" &&
          (mensagensVencidas(anuncio, agora) ? (
            <span className="text-tinta-suave">Mensagens apagadas {DIAS_DAS_MENSAGENS} dias depois do vencimento</span>
          ) : (
            <span>Mensagens para ler até {formatarDia(mensagensAte(anuncio))}</span>
          ))}
      </div>
      {visitas && <VisitasNaLista resumo={visitas} />}
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/minha-conta/anuncios/${anuncio.id}`} className="botao botao-vazado botao-pequeno">
          {anuncio.pagamentoPendente ? "Pagar e editar" : situacao === "EXPIRADO" ? "Renovar e editar" : "Abrir"}
        </Link>
        {/* Feature 020 (RF-205): atalho para o kit de divulgação. */}
        {situacao === "NO_AR" && (
          <Link href={`/minha-conta/anuncios/${anuncio.id}#divulgar`} className="botao botao-pequeno">
            Divulgar
          </Link>
        )}
        {(situacao === "NO_AR" || situacao === "DESATIVADO") && (
          <BotaoAtivarDesativar anuncioId={anuncio.id} desativado={situacao === "DESATIVADO"} ate={formatarDia(anuncio.expiraEm)} />
        )}
      </div>
    </li>
  )
}
