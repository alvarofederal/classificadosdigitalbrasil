// APRESENTAÇÃO — um anúncio do anunciante: pagamento, texto e formatação, álbum, mensagens e histórico.

import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Faixa } from "@/components/jornal/pecas"
import { situacaoExibida } from "@/domain/anuncio/anuncio"
import { SITUACOES_DO_PAGAMENTO } from "@/domain/pagamento/pagamento"
import { container } from "@/infrastructure/container"
import { diasRestantes, formatarDataHora, formatarDia, formatarReais, plural, reaisParaCampo } from "@/lib/formatadores"
import { exigirPerfil } from "@/lib/sessao"
import { caminhoDaSecao, caminhoDoAnuncio } from "@/lib/site"
import { AlbumFotos } from "../../_componentes/album-fotos"
import { BotaoRemover, BotaoRenovar } from "../../_componentes/botoes-anuncio"
import { CobrancaPixCartao } from "../../_componentes/cobranca-pix"
import { EditorAnuncio } from "../../_componentes/editor-anuncio"
import { SeloSituacao } from "../../_componentes/selo-situacao"
import { editarAnuncioAction } from "../../actions"

export const metadata: Metadata = { title: "Meu anúncio", robots: { index: false } }

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ novo?: string }> }

export default async function MeuAnuncio({ params, searchParams }: Props) {
  const usuario = await exigirPerfil("ANUNCIANTE")
  const { id } = await params
  const c = container()
  const anuncio = await c.minhaConta.meuAnuncio(usuario.id, id)
  if (!anuncio) notFound()

  const agora = c.relogio.agora()
  const situacao = situacaoExibida(anuncio.situacao, anuncio.expiraEm, agora)
  const cidade = c.localidades.cidade(anuncio.cidadeCodigo)
  const [categorias, cobranca] = await Promise.all([
    c.classificados.categoriasAtivas(),
    anuncio.pagamentoPendente ? c.montarCobrancaPix.executar(anuncio.pagamentoPendente) : Promise.resolve(null),
  ])
  // A seção atual continua na lista mesmo se o admin a desativou depois.
  const opcoes = categorias.some((cat) => cat.id === anuncio.categoriaId) ? categorias : [{ id: anuncio.categoriaId, nome: anuncio.categoriaNome }, ...categorias]
  if (anuncio.mensagensNaoLidas > 0) await c.marcarMensagensLidas.executar({ usuarioId: usuario.id, perfil: usuario.perfil }, anuncio.id)
  const recemCriado = (await searchParams).novo === "1"

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/minha-conta" className="font-titulo text-xs uppercase tracking-wider hover:underline">
          ← Meus anúncios
        </Link>
        <Faixa como="h1">{anuncio.titulo}</Faixa>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <SeloSituacao situacao={situacao} />
          <span>
            {anuncio.categoriaNome} · {cidade ? `${cidade.nome}/${cidade.uf}` : anuncio.uf}
          </span>
          {situacao === "NO_AR" && (
            <>
              <span>
                No ar até {formatarDia(anuncio.expiraEm)} ({plural(diasRestantes(anuncio.expiraEm, agora), "dia", "dias")})
              </span>
              <Link href={caminhoDoAnuncio(anuncio.codigo)} className="link">
                Ver no caderno
              </Link>
              {cidade && (
                <Link href={caminhoDaSecao(cidade, anuncio.categoriaSlug)} className="link">
                  Ver a seção
                </Link>
              )}
            </>
          )}
          {situacao === "EXPIRADO" && <span>Expirou em {formatarDia(anuncio.expiraEm)}</span>}
        </div>
      </div>

      {recemCriado && (
        <p className="border-2 border-sucesso bg-sucesso/10 px-3 py-2">
          Anúncio salvo. Pague o Pix abaixo para ele entrar no caderno. Enquanto isso, você já pode subir as fotos do álbum.
        </p>
      )}

      {cobranca ? (
        <CobrancaPixCartao cobranca={cobranca} />
      ) : (
        (situacao === "NO_AR" || situacao === "EXPIRADO") && (
          <div className="flex flex-wrap items-center gap-3 border border-fio p-4">
            <p className="flex-1">
              {situacao === "NO_AR"
                ? "Quer mais tempo no caderno? Pagar de novo soma os dias ao que ainda resta."
                : "O anúncio saiu do caderno. Renove para ele voltar com o mesmo texto e as mesmas fotos."}
            </p>
            <BotaoRenovar anuncioId={anuncio.id} rotulo={situacao === "NO_AR" ? "Adicionar mais dias" : "Renovar anúncio"} />
          </div>
        )
      )}

      <section aria-labelledby="titulo-texto" className="flex flex-col gap-3">
        <h2 id="titulo-texto" className="border-b-2 border-tinta pb-1 font-titulo text-lg font-bold uppercase">
          Texto e formatação
        </h2>
        <EditorAnuncio
          acao={editarAnuncioAction.bind(null, anuncio.id)}
          categorias={opcoes}
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

      <section aria-labelledby="titulo-album" className="flex flex-col gap-3">
        <h2 id="titulo-album" className="border-b-2 border-tinta pb-1 font-titulo text-lg font-bold uppercase">
          Álbum de fotos
        </h2>
        <AlbumFotos anuncioId={anuncio.id} fotos={anuncio.fotos} />
      </section>

      <section aria-labelledby="titulo-mensagens" className="flex flex-col gap-3">
        <h2 id="titulo-mensagens" className="border-b-2 border-tinta pb-1 font-titulo text-lg font-bold uppercase">
          Mensagens recebidas ({anuncio.mensagens.length})
        </h2>
        {anuncio.mensagens.length === 0 ? (
          <p className="text-sm text-tinta-suave">Nenhuma mensagem ainda. Elas aparecem aqui quando alguém usa o botão de mensagem do anúncio.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {anuncio.mensagens.map((m) => (
              <li key={m.id} className="cartao p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-titulo font-bold uppercase">
                    {m.nome} {!m.lida && <span className="faixa ml-1 px-1.5 text-xs">Nova</span>}
                  </p>
                  <span className="text-xs text-tinta-suave">{formatarDataHora(m.criadoEm)}</span>
                </div>
                <p className="mt-1 whitespace-pre-line">{m.texto}</p>
                <p className="mt-2 text-sm">
                  Responder para: <strong className="select-all">{m.contato}</strong>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {anuncio.pagamentos.length > 0 && (
        <section aria-labelledby="titulo-pagamentos" className="flex flex-col gap-3">
          <h2 id="titulo-pagamentos" className="border-b-2 border-tinta pb-1 font-titulo text-lg font-bold uppercase">
            Pagamentos
          </h2>
          <div className="overflow-x-auto">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Valor</th>
                  <th>Período</th>
                  <th>Situação</th>
                  <th>Gerado em</th>
                  <th>Confirmado em</th>
                </tr>
              </thead>
              <tbody>
                {anuncio.pagamentos.map((p) => (
                  <tr key={p.id}>
                    <td className="font-mono text-xs">{p.codigo}</td>
                    <td>{formatarReais(p.valorCentavos)}</td>
                    <td>{plural(p.dias, "dia", "dias")}</td>
                    <td>{SITUACOES_DO_PAGAMENTO[p.situacao]}</td>
                    <td>{formatarDataHora(p.criadoEm)}</td>
                    <td>{formatarDataHora(p.confirmadoEm)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="border-t border-fio pt-4">
        <BotaoRemover anuncioId={anuncio.id} />
      </div>
    </div>
  )
}
