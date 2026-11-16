// APRESENTAÇÃO — um anúncio do anunciante: pagamento, visitas (feature 013), texto e formatação, álbum, mensagens e histórico.

import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Faixa } from "@/components/jornal/pecas"
import { SecaoDeVisitas } from "@/components/visitas/visitas"
import { MAXIMO_FOTOS, avisoDoRecemCriado, situacaoExibida } from "@/domain/anuncio/anuncio"
import { textoParaDivulgar } from "@/domain/anuncio/divulgacao"
import { ORIGENS_DO_PAGAMENTO, SITUACOES_DO_PAGAMENTO } from "@/domain/pagamento/pagamento"
import { container } from "@/infrastructure/container"
import { diasRestantes, formatarDataHora, formatarDia, formatarReais, plural, reaisParaCampo } from "@/lib/formatadores"
import { NOMES_DOS_PLANOS } from "@/lib/planos"
import { exigirPerfil } from "@/lib/sessao"
import { caminhoDaSecao, caminhoDoAnuncio, urlDoSite } from "@/lib/site"
import { AlbumFotos } from "../../_componentes/album-fotos"
import { BotaoAtivarDesativar, BotaoRemover, RenovarComPlano } from "../../_componentes/botoes-anuncio"
import { CobrancaPixCartao } from "../../_componentes/cobranca-pix"
import { EditorAnuncio } from "../../_componentes/editor-anuncio"
import { KitDeDivulgacao } from "../../_componentes/kit-de-divulgacao"
import { SeloSituacao } from "../../_componentes/selo-situacao"
import { adicionarFotosAction, editarAnuncioAction, prepararUploadAction, removerFotoAction, reordenarFotosAction } from "../../actions"

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
  const [categorias, planos, cobranca, visitas, banco] = await Promise.all([
    c.classificados.categoriasAtivas(),
    c.classificados.planosAVenda(),
    anuncio.pagamentoPendente ? c.montarCobrancaPix.executar(anuncio.pagamentoPendente) : Promise.resolve(null),
    // RF-132: só anúncio que já esteve no caderno tem visitas.
    anuncio.publicadoEm ? c.resumirVisitas.doAnuncio(anuncio) : Promise.resolve(null),
    // Feature 017 (RF-173): renovar ou prolongar com os dias do banco.
    c.minhaConta.saldoDoBanco(usuario.id),
  ])
  // RN-171 e RN-172: anúncio ainda em prazo aceita a partir de 1 dia, e Com foto só recebe dias com foto.
  const prazoAtual = situacao === "NO_AR" || situacao === "DESATIVADO" ? { planoCodigo: anuncio.planoCodigo } : null
  const maximoDeFotos = Math.min(MAXIMO_FOTOS, planos.find((p) => p.codigo === anuncio.planoCodigo)?.maxFotos ?? MAXIMO_FOTOS)
  // A seção atual continua na lista mesmo se o admin a desativou depois.
  const opcoes = categorias.some((cat) => cat.id === anuncio.categoriaId) ? categorias : [{ id: anuncio.categoriaId, nome: anuncio.categoriaNome }, ...categorias]
  if (anuncio.mensagensNaoLidas > 0) await c.marcarMensagensLidas.executar({ usuarioId: usuario.id, perfil: usuario.perfil }, anuncio.id)
  // RN-90: o aviso de quem acabou de criar acompanha o pagamento; depois de pago, não pede o Pix de novo.
  const aviso = avisoDoRecemCriado((await searchParams).novo === "1", situacao, cobranca !== null)
  const ultimoConfirmado = anuncio.pagamentos.filter((p) => p.confirmadoEm).sort((a, b) => (b.confirmadoEm?.getTime() ?? 0) - (a.confirmadoEm?.getTime() ?? 0))[0]
  const faltamFotos = maximoDeFotos > 0 && anuncio.fotos.length === 0

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
            {anuncio.categoriaNome} · {cidade ? `${cidade.nome}/${cidade.uf}` : anuncio.uf} · plano {NOMES_DOS_PLANOS[anuncio.planoCodigo]}
          </span>
          {visitas && (
            <a href="#titulo-visitas" className="link">
              {plural(anuncio.visualizacoes, "visita", "visitas")}
            </a>
          )}
          {situacao === "NO_AR" && (
            <>
              <span>
                No ar até {formatarDia(anuncio.expiraEm)} ({plural(diasRestantes(anuncio.expiraEm, agora), "dia", "dias")})
              </span>
              <Link href={caminhoDoAnuncio(anuncio.codigo)} className="link font-bold">
                Página do anúncio e divulgação
              </Link>
              {cidade && (
                <Link href={caminhoDaSecao(cidade, anuncio.categoriaSlug)} className="link">
                  Ver a seção
                </Link>
              )}
            </>
          )}
          {situacao === "EXPIRADO" && <span>Expirou em {formatarDia(anuncio.expiraEm)}</span>}
          {situacao === "DESATIVADO" && (
            <span>
              Prazo até {formatarDia(anuncio.expiraEm)} ({plural(diasRestantes(anuncio.expiraEm, agora), "dia", "dias")})
            </span>
          )}
        </div>
      </div>

      {(situacao === "NO_AR" || situacao === "DESATIVADO") && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border border-fio px-3 py-2 text-sm">
          <BotaoAtivarDesativar anuncioId={anuncio.id} desativado={situacao === "DESATIVADO"} ate={formatarDia(anuncio.expiraEm)} />
          <span>
            {situacao === "DESATIVADO"
              ? `Fora do caderno: ninguém vê o anúncio nem manda mensagem. Ativando, ele volta até ${formatarDia(anuncio.expiraEm)}.`
              : "Desativar tira o anúncio do caderno até você ativar de novo. O prazo continua correndo."}
          </span>
        </div>
      )}

      {aviso === "PAGAR" && (
        <p className="border-2 border-sucesso bg-sucesso/10 px-3 py-2">
          Anúncio salvo. Pague o Pix abaixo para ele entrar no caderno. Enquanto isso, você já pode subir as fotos do álbum.
        </p>
      )}
      {aviso === "NO_AR" && (
        <p role="status" className="border-2 border-sucesso bg-sucesso/10 px-3 py-2">
          {ultimoConfirmado?.gateway === "CORTESIA"
            ? "Anúncio publicado como cortesia."
            : ultimoConfirmado?.gateway === "BANCO"
              ? "Anúncio publicado com dias do banco."
              : "Pagamento confirmado."}{" "}
          O anúncio está no caderno até {formatarDia(anuncio.expiraEm)}.
          {faltamFotos && " Falta subir as fotos do álbum, mais abaixo."}{" "}
          {/* Feature 020 (RF-205): logo depois de publicar, o próximo passo é divulgar. */}
          <a href="#divulgar" className="link font-bold">
            Divulgue agora
          </a>
          .
        </p>
      )}

      {cobranca && <CobrancaPixCartao cobranca={cobranca} anuncioId={anuncio.id} />}

      {/* Feature 020 (RF-200): kit de divulgação, só para o anúncio no ar (RN-200). */}
      {situacao === "NO_AR" && (
        <section id="divulgar" aria-labelledby="titulo-divulgar" className="flex scroll-mt-4 flex-col gap-3">
          <h2 id="titulo-divulgar" className="border-b-2 border-tinta pb-1 font-titulo text-lg font-bold uppercase">
            Divulgar
          </h2>
          <p className="text-sm">
            O caderno leva o anúncio a quem procura no site e no Google. Para chegar a mais gente, mande o anúncio onde as pessoas já estão: no status, nos grupos e
            no papel.
          </p>
          <KitDeDivulgacao
            codigo={anuncio.codigo}
            texto={textoParaDivulgar(anuncio, cidade ? `${cidade.nome}/${cidade.uf}` : null, `${urlDoSite()}/a/${anuncio.codigo}`)}
          />
        </section>
      )}

      {visitas && <SecaoDeVisitas detalhe={visitas} publicadoEm={anuncio.publicadoEm} deQuem="dono" />}

      <details
        className="border border-fio p-4"
        open={(!cobranca && (situacao === "EXPIRADO" || (situacao === "AGUARDANDO_PAGAMENTO" && banco.SIMPLES + banco.FOTOS > 0))) || undefined}
      >
        <summary className="cursor-pointer font-titulo font-bold uppercase">
          {cobranca
            ? banco.SIMPLES + banco.FOTOS > 0
              ? "Trocar o plano ou usar dias do banco"
              : "Trocar plano ou período desta cobrança"
            : situacao === "NO_AR" || situacao === "DESATIVADO"
              ? "Mais dias ou outro plano"
              : situacao === "AGUARDANDO_PAGAMENTO"
                ? "Pôr o anúncio no caderno"
                : "Renovar o anúncio"}
        </summary>
        <p className="my-3 text-sm">
          {situacao === "NO_AR"
            ? "Pagar de novo, ou usar dias do banco, soma os dias ao que ainda resta. Escolhendo outro plano no Pix, ele vale a partir da confirmação."
            : situacao === "DESATIVADO"
              ? "Pagar de novo, ou usar dias do banco, soma os dias ao que ainda resta e põe o anúncio de volta no caderno."
              : "Escolha como pagar; o anúncio entra no caderno com o mesmo texto e as mesmas fotos. Usando os dias do banco, a cobrança em aberto é cancelada."}
        </p>
        <RenovarComPlano anuncioId={anuncio.id} planos={planos} planoAtual={anuncio.planoCodigo} rotulo="Gerar o Pix" banco={banco} prazoAtual={prazoAtual} />
      </details>

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
        {maximoDeFotos === 0 && anuncio.fotos.length === 0 ? (
          <p className="border border-dashed border-tinta p-4 text-sm">
            O plano {NOMES_DOS_PLANOS[anuncio.planoCodigo]} não tem fotos. Para colocar fotos, use &quot;Mais dias ou outro plano&quot; acima e escolha o plano Com foto.
          </p>
        ) : (
        <AlbumFotos
          anuncioId={anuncio.id}
          fotos={anuncio.fotos}
          maximo={maximoDeFotos}
          acoes={{ preparar: prepararUploadAction, adicionar: adicionarFotosAction, reordenar: reordenarFotosAction, remover: removerFotoAction }}
        />
        )}
      </section>

      <section aria-labelledby="titulo-mensagens" className="flex flex-col gap-3">
        <h2 id="titulo-mensagens" className="border-b-2 border-tinta pb-1 font-titulo text-lg font-bold uppercase">
          Mensagens recebidas ({anuncio.mensagens.length})
        </h2>
        {c.correio.ligado && (
          <p className="text-sm">
            Quando chega mensagem, avisamos em <strong>{usuario.email}</strong>.
          </p>
        )}
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
                  <th>Plano</th>
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
                    <td>{NOMES_DOS_PLANOS[p.planoCodigo]}</td>
                    {/* RN-181: o uso do banco aparece como "Dias do banco". */}
                    <td>{p.gateway === "CORTESIA" || p.gateway === "BANCO" ? ORIGENS_DO_PAGAMENTO[p.gateway] : formatarReais(p.valorCentavos)}</td>
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
