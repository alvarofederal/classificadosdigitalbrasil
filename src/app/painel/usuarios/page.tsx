// APRESENTAÇÃO — lista de usuários com a situação de pagamento, paginada (RF-31).

import type { Metadata } from "next"
import { Faixa, Paginacao } from "@/components/jornal/pecas"
import type { FiltroDePagamento } from "@/application/queries/consultas"
import { PERFIS } from "@/domain/usuario/usuario"
import { container } from "@/infrastructure/container"
import { formatarCelular, formatarDia, formatarReais } from "@/lib/formatadores"
import { paginaDe, parametro } from "@/lib/formularios"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Usuários", robots: { index: false } }

const POR_PAGINA = 20
const FILTROS: Record<FiltroDePagamento, string> = {
  TODOS: "Todos",
  PAGOS: "Pagaram",
  PENDENTES: "Com Pix pendente",
  SEM_PAGAMENTO: "Nunca pagaram",
}

type Busca = { pagina?: string; busca?: string; pagamento?: string }

export default async function Usuarios({ searchParams }: { searchParams: Promise<Busca> }) {
  const busca = await searchParams
  const pagina = paginaDe(busca.pagina)
  const termo = parametro(busca.busca)
  const pagamento = (Object.keys(FILTROS) as FiltroDePagamento[]).find((f) => f === busca.pagamento) ?? "TODOS"
  const c = container()
  const lista = await c.painel.usuarios({ pagina, porPagina: POR_PAGINA, busca: termo, pagamento })

  const endereco = (p: number) => {
    const q = new URLSearchParams()
    if (termo) q.set("busca", termo)
    if (pagamento !== "TODOS") q.set("pagamento", pagamento)
    if (p > 1) q.set("pagina", String(p))
    const s = q.toString()
    return s ? `/painel/usuarios?${s}` : "/painel/usuarios"
  }

  return (
    <div className="flex flex-col gap-5">
      <Faixa como="h1">Usuários ({lista.total})</Faixa>

      <form className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem_auto] sm:items-end" role="search">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="busca" className="rotulo">
            Nome ou e-mail
          </label>
          <input id="busca" name="busca" className="campo" defaultValue={termo ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="pagamento" className="rotulo">
            Pagamento
          </label>
          <select id="pagamento" name="pagamento" className="campo" defaultValue={pagamento}>
            {(Object.keys(FILTROS) as FiltroDePagamento[]).map((f) => (
              <option key={f} value={f}>
                {FILTROS[f]}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="botao">
          Filtrar
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="tabela">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Contato</th>
              <th>Cidade</th>
              <th>Cadastro</th>
              <th>Anúncios</th>
              <th>Pagamento</th>
              <th>Pago</th>
            </tr>
          </thead>
          <tbody>
            {lista.itens.map((u) => {
              const cidade = c.localidades.cidade(u.cidadeCodigo)
              const pago = u.pagamentosConfirmados > 0
              return (
                <tr key={u.id}>
                  <td>
                    <strong>{u.nome}</strong>
                    {u.perfil === "ADMIN" && <span className="ml-1 text-xs uppercase">({PERFIS.ADMIN})</span>}
                    {!u.ativo && <span className="ml-1 text-xs text-perigo">(inativo)</span>}
                  </td>
                  <td>
                    {u.email}
                    <br />
                    <span className="text-tinta-suave">{u.celular ? formatarCelular(u.celular) : "—"}</span>
                  </td>
                  <td>{cidade ? `${cidade.nome}/${cidade.uf}` : "—"}</td>
                  <td>{formatarDia(u.criadoEm)}</td>
                  <td>{u.totalAnuncios}</td>
                  <td>
                    <span
                      className={cn(
                        "inline-block border px-1.5 py-0.5 font-titulo text-xs font-semibold uppercase",
                        pago ? "border-sucesso bg-sucesso text-white" : u.pagamentosPendentes > 0 ? "border-tinta bg-papel-escuro" : "border-tinta-suave text-tinta-suave",
                      )}
                    >
                      {pago ? "Pago" : u.pagamentosPendentes > 0 ? "Pix pendente" : "Sem pagamento"}
                    </span>
                    {pago && u.pagamentosPendentes > 0 && <span className="ml-1 text-xs">+{u.pagamentosPendentes} pendente(s)</span>}
                  </td>
                  <td className="whitespace-nowrap">
                    {pago ? (
                      <>
                        {formatarReais(u.valorPagoCentavos)} ({u.pagamentosConfirmados}×)
                        <br />
                        <span className="text-xs text-tinta-suave">último em {formatarDia(u.ultimoPagamentoEm)}</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              )
            })}
            {lista.itens.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-tinta-suave">
                  Nenhum usuário encontrado.
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
