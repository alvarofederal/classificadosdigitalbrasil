// APRESENTAÇÃO — o anúncio pelo admin: editar, fotos, publicar como cortesia, confirmar Pix, visitas, mensagens (feature 007: RF-84, RF-93; feature 013: RF-133).

import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Faixa } from "@/components/jornal/pecas"
import { SecaoDeVisitas } from "@/components/visitas/visitas"
import { MAXIMO_FOTOS, situacaoExibida } from "@/domain/anuncio/anuncio"
import { ORIGENS_DO_PAGAMENTO, SITUACOES_DO_PAGAMENTO } from "@/domain/pagamento/pagamento"
import { container } from "@/infrastructure/container"
import { formatarCelular, formatarDataHora, formatarDia, formatarReais, plural, reaisParaCampo } from "@/lib/formatadores"
import { NOMES_DOS_PLANOS } from "@/lib/planos"
import { AlbumFotos } from "../../../minha-conta/_componentes/album-fotos"
import { EditorAnuncio } from "../../../minha-conta/_componentes/editor-anuncio"
import { SeloSituacao } from "../../../minha-conta/_componentes/selo-situacao"
import { BotaoAcao } from "../../_componentes/botao-acao"
import {
  adicionarFotosAdminAction,
  confirmarPagamentoAction,
  editarAnuncioAdminAction,
  prepararUploadAdminAction,
  removerAnuncioAdminAction,
  removerFotoAdminAction,
  reordenarFotosAdminAction,
  restaurarAnuncioAction,
} from "../../actions"
import { FormularioCortesia } from "./formulario-cortesia"

export const metadata: Metadata = { title: "Anúncio", robots: { index: false } }

export default async function AnuncioNoPainel({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const c = container()
  const anuncio = await c.painel.anuncio(id)
  if (!anuncio) notFound()
  const agora = c.relogio.agora()
  const situacao = situacaoExibida(anuncio.situacao, anuncio.expiraEm, agora)
  const cidade = c.localidades.cidade(anuncio.cidadeCodigo)
  const [categorias, planos, visitas] = await Promise.all([
    c.classificados.categoriasAtivas(),
    c.painel.planos(),
    anuncio.publicadoEm ? c.resumirVisitas.doAnuncio(anuncio) : Promise.resolve(null),
  ])
  const opcoes = categorias.some((cat) => cat.id === anuncio.categoriaId) ? categorias : [{ id: anuncio.categoriaId, nome: anuncio.categoriaNome }, ...categorias]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/painel/anuncios" className="font-titulo text-xs uppercase tracking-wider hover:underline">
          ← Anúncios
        </Link>
        <Faixa como="h1">{anuncio.titulo}</Faixa>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <SeloSituacao situacao={situacao} />
          <span className="font-mono">{anuncio.codigo}</span>
          <span>
            {anuncio.categoriaNome} · {cidade ? `${cidade.nome}/${cidade.uf}` : anuncio.uf} · plano {NOMES_DOS_PLANOS[anuncio.planoCodigo]}
          </span>
          {situacao === "NO_AR" && <span>no ar até {formatarDia(anuncio.expiraEm)}</span>}
          {visitas && (
            <a href="#titulo-visitas" className="link">
              {plural(anuncio.visualizacoes, "visita", "visitas")}
            </a>
          )}
          {situacao === "NO_AR" && (
            <Link href={`/anuncio/${anuncio.codigo}`} className="link">
              Ver no site
            </Link>
          )}
        </div>
        <p className="text-sm">
          Anunciante: <strong>{anuncio.anunciante.nome}</strong> · {anuncio.anunciante.email}
          {anuncio.anunciante.celular && ` · ${formatarCelular(anuncio.anunciante.celular)}`}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="border-2 border-tinta p-4">
          <h2 className="mb-2 font-titulo text-lg font-bold uppercase">Publicar como cortesia</h2>
          <p className="mb-3 text-sm">Coloca o anúncio no ar sem cobrança, no plano e pelos dias escolhidos (parceiros, anúncio-exemplo). Fica registrado como cortesia.</p>
          <FormularioCortesia anuncioId={anuncio.id} planos={planos.map((p) => ({ codigo: p.codigo, nome: p.nome }))} planoAtual={anuncio.planoCodigo} />
        </section>
        <section className="flex flex-col gap-3 border border-fio p-4">
          <h2 className="font-titulo text-lg font-bold uppercase">Situação</h2>
          {anuncio.pagamentoPendente && anuncio.situacao !== "REMOVIDO" && (
            <BotaoAcao
              acao={confirmarPagamentoAction.bind(null, anuncio.pagamentoPendente.id)}
              rotulo={`Confirmar Pix de ${formatarReais(anuncio.pagamentoPendente.valorCentavos)} (${anuncio.pagamentoPendente.codigo})`}
              confirmacao="Confirmar o recebimento deste Pix?"
            />
          )}
          {anuncio.situacao === "REMOVIDO" ? (
            <BotaoAcao acao={restaurarAnuncioAction.bind(null, anuncio.id)} rotulo="Restaurar anúncio" vazado />
          ) : (
            <BotaoAcao acao={removerAnuncioAdminAction.bind(null, anuncio.id)} rotulo="Remover do caderno" confirmacao="Remover este anúncio do caderno?" perigo vazado />
          )}
        </section>
      </div>

      {visitas && <SecaoDeVisitas detalhe={visitas} publicadoEm={anuncio.publicadoEm} deQuem="admin" />}

      <section className="flex flex-col gap-3">
        <h2 className="border-b-2 border-tinta pb-1 font-titulo text-lg font-bold uppercase">Texto e formatação</h2>
        <EditorAnuncio
          acao={editarAnuncioAdminAction.bind(null, anuncio.id)}
          categorias={opcoes}
          planoAtual={anuncio.planoCodigo}
          iniciais={{
            categoriaId: anuncio.categoriaId,
            uf: anuncio.uf,
            cidadeCodigo: anuncio.cidadeCodigo,
            titulo: anuncio.titulo,
            texto: anuncio.texto,
            preco: reaisParaCampo(anuncio.precoCentavos),
            estilo: anuncio.estilo,
          }}
          textoDoBotao="Salvar alterações"
          totalFotos={anuncio.fotos.length}
          codigo={anuncio.codigo}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="border-b-2 border-tinta pb-1 font-titulo text-lg font-bold uppercase">Álbum de fotos</h2>
        <AlbumFotos
          anuncioId={anuncio.id}
          fotos={anuncio.fotos}
          maximo={MAXIMO_FOTOS}
          acoes={{ preparar: prepararUploadAdminAction, adicionar: adicionarFotosAdminAction, reordenar: reordenarFotosAdminAction, remover: removerFotoAdminAction }}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="border-b-2 border-tinta pb-1 font-titulo text-lg font-bold uppercase">Mensagens ({anuncio.mensagens.length})</h2>
        {anuncio.mensagens.length === 0 ? (
          <p className="text-sm text-tinta-suave">Nenhuma mensagem.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {anuncio.mensagens.map((m) => (
              <li key={m.id} className="border border-fio p-3">
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="font-titulo font-bold uppercase">{m.nome}</p>
                  <span className="text-xs text-tinta-suave">{formatarDataHora(m.criadoEm)}</span>
                </div>
                <p className="mt-1 whitespace-pre-line">{m.texto}</p>
                <p className="mt-1 text-sm">
                  Contato: <strong className="select-all">{m.contato}</strong>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="border-b-2 border-tinta pb-1 font-titulo text-lg font-bold uppercase">Pagamentos</h2>
        <div className="overflow-x-auto">
          <table className="tabela">
            <thead>
              <tr>
                <th>Código</th>
                <th>Plano</th>
                <th>Valor</th>
                <th>Dias</th>
                <th>Origem</th>
                <th>Situação</th>
                <th>Gerado</th>
                <th>Confirmado</th>
              </tr>
            </thead>
            <tbody>
              {anuncio.pagamentos.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono text-xs">{p.codigo}</td>
                  <td>{NOMES_DOS_PLANOS[p.planoCodigo]}</td>
                  <td>{formatarReais(p.valorCentavos)}</td>
                  <td>{p.dias}</td>
                  <td>{p.gateway ? ORIGENS_DO_PAGAMENTO[p.gateway] : "Pix estático"}</td>
                  <td>{SITUACOES_DO_PAGAMENTO[p.situacao]}</td>
                  <td>{formatarDataHora(p.criadoEm)}</td>
                  <td>{formatarDataHora(p.confirmadoEm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
