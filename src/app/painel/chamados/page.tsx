// APRESENTAÇÃO — chamados de contato (feature 004: RF-63).

import type { Metadata } from "next"
import Link from "next/link"
import { Faixa, Paginacao } from "@/components/jornal/pecas"
import { ASSUNTOS, type Assunto, SITUACOES_DO_CHAMADO, type SituacaoDoChamado } from "@/domain/chamado/chamado"
import { container } from "@/infrastructure/container"
import { formatarCelular, formatarDataHora } from "@/lib/formatadores"
import { paginaDe } from "@/lib/formularios"
import { cn } from "@/lib/utils"
import { AcoesDoChamado } from "./acoes-do-chamado"

export const metadata: Metadata = { title: "Chamados", robots: { index: false } }

const POR_PAGINA = 20

type Busca = { pagina?: string; situacao?: string; assunto?: string }

export default async function Chamados({ searchParams }: { searchParams: Promise<Busca> }) {
  const busca = await searchParams
  const pagina = paginaDe(busca.pagina)
  const situacao: SituacaoDoChamado | null = busca.situacao === "RESOLVIDO" ? "RESOLVIDO" : busca.situacao === "TODOS" ? null : "ABERTO"
  const assunto = busca.assunto && busca.assunto in ASSUNTOS ? (busca.assunto as Assunto) : null
  const lista = await container().painel.chamados({ pagina, porPagina: POR_PAGINA, situacao, assunto })

  const endereco = (p: number) => {
    const q = new URLSearchParams()
    if (busca.situacao) q.set("situacao", busca.situacao)
    if (assunto) q.set("assunto", assunto)
    if (p > 1) q.set("pagina", String(p))
    return `/painel/chamados?${q.toString()}`
  }

  return (
    <div className="flex flex-col gap-5">
      <Faixa como="h1">Chamados ({lista.total})</Faixa>

      <form className="flex flex-wrap items-end gap-3" role="search">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="situacao" className="rotulo">
            Situação
          </label>
          <select id="situacao" name="situacao" className="campo" defaultValue={busca.situacao ?? "ABERTO"}>
            <option value="ABERTO">Abertos</option>
            <option value="RESOLVIDO">Resolvidos</option>
            <option value="TODOS">Todos</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="assunto" className="rotulo">
            Assunto
          </label>
          <select id="assunto" name="assunto" className="campo" defaultValue={assunto ?? ""}>
            <option value="">Todos</option>
            {(Object.keys(ASSUNTOS) as Assunto[]).map((a) => (
              <option key={a} value={a}>
                {ASSUNTOS[a]}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="botao">
          Filtrar
        </button>
      </form>

      {lista.itens.length === 0 ? (
        <p className="text-tinta-suave">Nenhum chamado com esses filtros.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {lista.itens.map((ch) => (
            <li key={ch.id} className={cn("border p-4", ch.situacao === "ABERTO" ? "border-2 border-tinta" : "border-fio")}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-titulo font-bold uppercase">
                  {ASSUNTOS[ch.assunto]} · <span className="font-mono">{ch.protocolo}</span>
                </p>
                <span className="text-xs text-tinta-suave">
                  {formatarDataHora(ch.criadoEm)} · {SITUACOES_DO_CHAMADO[ch.situacao]}
                  {ch.resolvidoEm && ` em ${formatarDataHora(ch.resolvidoEm)}`}
                </span>
              </div>
              <p className="mt-1 text-sm">
                <strong>{ch.nome}</strong> ·{" "}
                <a href={`mailto:${ch.email}?subject=${encodeURIComponent(`Classificados Digitais do Brasil · protocolo ${ch.protocolo}`)}`} className="link">
                  {ch.email}
                </a>
                {ch.telefone && (
                  <>
                    {" "}
                    ·{" "}
                    <a href={`https://wa.me/55${ch.telefone}`} target="_blank" rel="noreferrer" className="link">
                      {formatarCelular(ch.telefone)}
                    </a>
                  </>
                )}
                {ch.anuncioCodigo && (
                  <>
                    {" "}
                    · anúncio{" "}
                    <Link href={`/anuncio/${ch.anuncioCodigo}`} className="link font-mono">
                      {ch.anuncioCodigo}
                    </Link>
                  </>
                )}
              </p>
              <p className="mt-2 whitespace-pre-line">{ch.mensagem}</p>
              <AcoesDoChamado id={ch.id} resolvido={ch.situacao === "RESOLVIDO"} notaInterna={ch.notaInterna} />
            </li>
          ))}
        </ul>
      )}
      <Paginacao pagina={pagina} total={lista.total} porPagina={POR_PAGINA} endereco={endereco} />
    </div>
  )
}
