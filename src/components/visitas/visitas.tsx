// APRESENTAÇÃO — visitas do anúncio para o dono e o administrador (feature 013: RF-131 a RF-133, RN-132, RN-136).

import { Eye } from "lucide-react"
import type { DetalheDasVisitas } from "@/application/use-cases/anuncios/visitas"
import { DIAS_NO_GRAFICO_DO_ANUNCIO, INICIO_DA_CONTAGEM_POR_PESSOA, type ResumoDeVisitas, diaDeBrasilia } from "@/domain/anuncio/visitas"
import { plural } from "@/lib/formatadores"
import { GraficoDeVisitas } from "./grafico-de-visitas"

const NUMERO = new Intl.NumberFormat("pt-BR")
const diaEMesEAno = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}/${dia.slice(0, 4)}`

/** RF-131: a linha de visitas de cada anúncio na lista de Minha conta. */
export function VisitasNaLista({ resumo }: { resumo: ResumoDeVisitas }) {
  return (
    <div className="flex items-end justify-between gap-3 border-t border-fio/25 pt-2">
      <p className="flex flex-wrap items-center gap-x-1.5 text-sm">
        <Eye className="size-4" aria-hidden />
        <span>
          <strong>{NUMERO.format(resumo.visitas)}</strong> {resumo.visitas === 1 ? "visita" : "visitas"}
        </span>
        {resumo.pessoas !== null && (
          <span>
            · <strong>{NUMERO.format(resumo.pessoas)}</strong> {resumo.pessoas === 1 ? "pessoa" : "pessoas"}
          </span>
        )}
        <span>
          · <strong>{NUMERO.format(resumo.hoje.visitas)}</strong> hoje
        </span>
      </p>
      <div className="w-24 shrink-0">
        <GraficoDeVisitas dias={resumo.dias} maiorDia={resumo.maiorDia} altura={28} rotulo="Visitas nos últimos 7 dias" comPessoas={resumo.pessoas !== null} />
        <p className="mt-0.5 text-right font-titulo text-[10px] uppercase tracking-wider text-tinta-suave">Últimos 7 dias</p>
      </div>
    </div>
  )
}

function Numero({ valor, rotulo }: { valor: number | null; rotulo: string }) {
  return (
    <div className="border-l-2 border-tinta pl-3">
      <dt className="font-titulo text-xs uppercase tracking-wider text-tinta-suave">{rotulo}</dt>
      <dd className="font-titulo text-3xl font-bold leading-tight">{valor === null ? "—" : NUMERO.format(valor)}</dd>
    </div>
  )
}

/**
 * RF-132 e RF-133: a seção completa na tela do anúncio. `publicadoEm` decide o aviso de que pessoas, dias e
 * cidades só contam desde esta entrega (RN-136).
 */
export function SecaoDeVisitas({ detalhe, publicadoEm, deQuem }: { detalhe: DetalheDasVisitas; publicadoEm: Date | null; deQuem: "dono" | "admin" }) {
  const { resumo, cidades } = detalhe
  const comPessoas = resumo.pessoas !== null
  const diasComVisita = [...resumo.dias].reverse().filter((d) => d.visitas > 0)
  const maiorCidade = Math.max(1, ...cidades.map((c) => c.pessoas))
  const antesDaContagem = publicadoEm !== null && diaDeBrasilia(publicadoEm) < INICIO_DA_CONTAGEM_POR_PESSOA

  return (
    <section aria-labelledby="titulo-visitas" className="flex flex-col gap-4">
      <h2 id="titulo-visitas" className="border-b-2 border-tinta pb-1 font-titulo text-lg font-bold uppercase">
        Visitas
      </h2>

      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Numero rotulo="Visitas" valor={resumo.visitas} />
        <Numero rotulo="Pessoas" valor={resumo.pessoas} />
        <Numero rotulo="Hoje" valor={resumo.hoje.visitas} />
        <Numero rotulo="Últimos 7 dias" valor={resumo.visitasNaSemana} />
      </dl>

      <figure className="flex flex-col gap-2">
        <figcaption className="font-titulo text-sm font-bold uppercase">Visitas por dia, últimos {DIAS_NO_GRAFICO_DO_ANUNCIO} dias</figcaption>
        {resumo.maiorDia === 0 ? (
          <p className="text-sm text-tinta-suave">Nenhuma visita nos últimos {DIAS_NO_GRAFICO_DO_ANUNCIO} dias.</p>
        ) : (
          <>
            <div className="flex items-baseline justify-between text-xs text-tinta-suave">
              <span>Melhor dia: {plural(resumo.maiorDia, "visita", "visitas")}</span>
            </div>
            <GraficoDeVisitas dias={resumo.dias} maiorDia={resumo.maiorDia} altura={120} rotulo={`Visitas por dia nos últimos ${DIAS_NO_GRAFICO_DO_ANUNCIO} dias`} comPessoas={comPessoas} comDatas />
            <details className="text-sm">
              <summary className="cursor-pointer font-titulo text-xs uppercase tracking-wider">Ver os números por dia</summary>
              <div className="mt-2 overflow-x-auto">
                <table className="tabela">
                  <thead>
                    <tr>
                      <th>Dia</th>
                      <th>Visitas</th>
                      {comPessoas && <th>Pessoas</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {diasComVisita.map((d) => (
                      <tr key={d.dia}>
                        <td>{d.dia === resumo.hoje.dia ? "Hoje" : diaEMesEAno(d.dia)}</td>
                        <td>{NUMERO.format(d.visitas)}</td>
                        {comPessoas && <td>{NUMERO.format(d.pessoas)}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        )}
      </figure>

      {comPessoas && (
        <div className="flex flex-col gap-2">
          <h3 className="font-titulo text-sm font-bold uppercase">De onde vêm as pessoas</h3>
          {cidades.length === 0 ? (
            <p className="text-sm text-tinta-suave">Ainda sem visitas para mostrar as cidades.</p>
          ) : (
            <ul className="flex max-w-2xl flex-col gap-1.5">
              {cidades.map((c) => (
                <li key={c.nome} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[minmax(0,14rem)_1fr_auto]">
                  <span className={c.agrupada ? "truncate text-tinta-suave" : "truncate"}>{c.nome}</span>
                  <span className="h-2 rounded-full bg-papel-escuro" aria-hidden>
                    <span className="block h-full rounded-full bg-tinta" style={{ width: `${(c.pessoas / maiorCidade) * 100}%` }} />
                  </span>
                  <span className="text-right tabular-nums">{plural(c.pessoas, "pessoa", "pessoas")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1 text-xs text-tinta-suave">
        <p>
          Não contam {deQuem === "dono" ? "as suas próprias visitas" : "as visitas do dono"}, as do administrador, robôs de busca e prévias de link (como a do WhatsApp).
          {comPessoas && " A mesma conexão de internet com o mesmo aparelho conta como uma pessoa."}
        </p>
        {comPessoas && <p>A cidade é a aproximada da conexão de internet. No celular, costuma aparecer a cidade da operadora. O site não guarda o endereço IP de ninguém.</p>}
        {antesDaContagem && <p>Pessoas, dias e cidades contam desde {diaEMesEAno(INICIO_DA_CONTAGEM_POR_PESSOA)}; o total de visitas inclui as de antes.</p>}
      </div>
    </section>
  )
}
