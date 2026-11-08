// APRESENTAÇÃO — anúncios com filtros de data inicial e final, estado, cidade, seção e situação (RF-33, RF-34).

import type { Metadata } from "next"
import Link from "next/link"
import { Faixa, Paginacao } from "@/components/jornal/pecas"
import { SeletorLocalidade } from "@/components/seletor-localidade"
import { SITUACOES_EXIBIDAS, type SituacaoExibida, situacaoExibida } from "@/domain/anuncio/anuncio"
import { ufDe } from "@/domain/localidade/uf"
import { container } from "@/infrastructure/container"
import { formatarDia, formatarReais } from "@/lib/formatadores"
import { paginaDe, parametro } from "@/lib/formularios"
import { SeloSituacao } from "../../minha-conta/_componentes/selo-situacao"
import { BotaoAcao } from "../_componentes/botao-acao"
import { confirmarPagamentoAction, removerAnuncioAdminAction, restaurarAnuncioAction } from "../actions"

export const metadata: Metadata = { title: "Anúncios", robots: { index: false } }

const POR_PAGINA = 20
const DATA = /^\d{4}-\d{2}-\d{2}$/

type Busca = Record<"pagina" | "dataInicial" | "dataFinal" | "uf" | "cidadeCodigo" | "categoria" | "situacao", string | undefined>

export default async function Anuncios({ searchParams }: { searchParams: Promise<Busca> }) {
  const busca = await searchParams
  const c = container()
  const agora = c.relogio.agora()

  const dataInicial = DATA.test(busca.dataInicial ?? "") ? busca.dataInicial! : null
  const dataFinal = DATA.test(busca.dataFinal ?? "") ? busca.dataFinal! : null
  const uf = ufDe(busca.uf)
  const cidade = c.localidades.cidade(Number(busca.cidadeCodigo))
  const cidadeCodigo = cidade && cidade.uf === uf ? cidade.codigo : null
  const categoriaId = parametro(busca.categoria)
  const situacao = (Object.keys(SITUACOES_EXIBIDAS) as SituacaoExibida[]).find((s) => s === busca.situacao) ?? null
  const pagina = paginaDe(busca.pagina)

  const [lista, categorias] = await Promise.all([
    c.painel.anuncios({ pagina, porPagina: POR_PAGINA, dataInicial, dataFinal, uf, cidadeCodigo, categoriaId, situacao }, agora),
    c.painel.categorias(),
  ])

  const endereco = (p: number) => {
    const q = new URLSearchParams()
    if (dataInicial) q.set("dataInicial", dataInicial)
    if (dataFinal) q.set("dataFinal", dataFinal)
    if (uf) q.set("uf", uf)
    if (cidadeCodigo) q.set("cidadeCodigo", String(cidadeCodigo))
    if (categoriaId) q.set("categoria", categoriaId)
    if (situacao) q.set("situacao", situacao)
    if (p > 1) q.set("pagina", String(p))
    return `/painel/anuncios?${q.toString()}`
  }

  return (
    <div className="flex flex-col gap-5">
      <Faixa como="h1">Anúncios ({lista.total})</Faixa>

      <form className="cartao grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-4" role="search">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="dataInicial" className="rotulo">
            Criados de
          </label>
          <input id="dataInicial" name="dataInicial" type="date" className="campo" defaultValue={dataInicial ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="dataFinal" className="rotulo">
            Até
          </label>
          <input id="dataFinal" name="dataFinal" type="date" className="campo" defaultValue={dataFinal ?? ""} />
        </div>
        <SeletorLocalidade ufInicial={uf ?? ""} cidadeInicial={cidadeCodigo ?? 0} textoTodasCidades="Todas as cidades" className="md:col-span-2" />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="categoria" className="rotulo">
            Seção
          </label>
          <select id="categoria" name="categoria" className="campo" defaultValue={categoriaId ?? ""}>
            <option value="">Todas</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="situacao" className="rotulo">
            Situação
          </label>
          <select id="situacao" name="situacao" className="campo" defaultValue={situacao ?? ""}>
            <option value="">Todas</option>
            {(Object.keys(SITUACOES_EXIBIDAS) as SituacaoExibida[]).map((s) => (
              <option key={s} value={s}>
                {SITUACOES_EXIBIDAS[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2 lg:col-span-2">
          <button type="submit" className="botao">
            Filtrar
          </button>
          <Link href="/painel/anuncios" className="botao botao-vazado">
            Limpar
          </Link>
        </div>
      </form>

      <div className="overflow-x-auto">
        <table className="tabela">
          <thead>
            <tr>
              <th>Anúncio</th>
              <th>Seção · Cidade</th>
              <th>Anunciante</th>
              <th>Criado</th>
              <th>Situação</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {lista.itens.map((a) => {
              const local = c.localidades.cidade(a.cidadeCodigo)
              const exibida = situacaoExibida(a.situacao, a.expiraEm, agora)
              return (
                <tr key={a.id}>
                  <td>
                    <strong className="font-titulo uppercase">{a.titulo}</strong>
                    <br />
                    <span className="font-mono text-xs text-tinta-suave">
                      {a.codigo} · {a.totalFotos} foto(s)
                    </span>
                  </td>
                  <td>
                    {a.categoriaNome}
                    <br />
                    <span className="text-tinta-suave">{local ? `${local.nome}/${local.uf}` : a.uf}</span>
                  </td>
                  <td>
                    {a.anuncianteNome}
                    <br />
                    <span className="text-tinta-suave">{a.anuncianteEmail}</span>
                  </td>
                  <td className="whitespace-nowrap">{formatarDia(a.criadoEm)}</td>
                  <td>
                    <SeloSituacao situacao={exibida} />
                    {exibida === "NO_AR" && <div className="mt-1 text-xs">até {formatarDia(a.expiraEm)}</div>}
                    {a.pagamentoPendente && (
                      <div className="mt-1 text-xs">
                        Pix {formatarReais(a.pagamentoPendente.valorCentavos)} · id <span className="font-mono">{a.pagamentoPendente.codigo}</span>
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="flex flex-col items-start gap-1.5">
                      {a.pagamentoPendente && a.situacao !== "REMOVIDO" && (
                        <BotaoAcao
                          acao={confirmarPagamentoAction.bind(null, a.pagamentoPendente.id)}
                          rotulo="Confirmar Pix"
                          confirmacao={`Confirmar o recebimento de ${formatarReais(a.pagamentoPendente.valorCentavos)} (identificador ${a.pagamentoPendente.codigo})?`}
                        />
                      )}
                      {exibida === "NO_AR" && (
                        <Link href={`/anuncio/${a.codigo}`} className="link text-sm">
                          Ver no site
                        </Link>
                      )}
                      {a.situacao === "REMOVIDO" ? (
                        <BotaoAcao acao={restaurarAnuncioAction.bind(null, a.id)} rotulo="Restaurar" vazado />
                      ) : (
                        <BotaoAcao
                          acao={removerAnuncioAdminAction.bind(null, a.id)}
                          rotulo="Remover"
                          confirmacao="Remover este anúncio do caderno?"
                          perigo
                          vazado
                        />
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
            {lista.itens.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-tinta-suave">
                  Nenhum anúncio com esses filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Paginacao pagina={pagina} total={lista.total} porPagina={POR_PAGINA} endereco={endereco} />
    </div>
  )
}
