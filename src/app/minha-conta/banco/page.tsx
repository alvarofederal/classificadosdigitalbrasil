// APRESENTAÇÃO — banco de dias: saldo e extrato (feature 017: RF-170, RF-171; RN-178).

import type { Metadata } from "next"
import Link from "next/link"
import { Faixa } from "@/components/jornal/pecas"
import { MOTIVOS_DO_MOVIMENTO, NOMES_DOS_TIPOS_DE_DIA } from "@/domain/banco/banco-de-dias"
import { container } from "@/infrastructure/container"
import { formatarDataHora } from "@/lib/formatadores"
import { exigirPerfil } from "@/lib/sessao"
import { CaixaDoBanco } from "../_componentes/caixa-do-banco"

export const metadata: Metadata = { title: "Banco de dias", robots: { index: false } }

/** O extrato mostra os movimentos mais recentes; uma conta comum não passa disso tão cedo. */
const LINHAS_DO_EXTRATO = 200

export default async function BancoDeDias() {
  const usuario = await exigirPerfil("ANUNCIANTE")
  const c = container()
  const [saldo, movimentos] = await Promise.all([c.minhaConta.saldoDoBanco(usuario.id), c.minhaConta.extratoDoBanco(usuario.id, LINHAS_DO_EXTRATO)])

  return (
    <div className="flex flex-col gap-5">
      <Faixa como="h1">Banco de dias</Faixa>
      <CaixaDoBanco saldo={saldo} comLinkDoExtrato={false} />

      <section aria-labelledby="titulo-extrato" className="flex flex-col gap-3">
        <h2 id="titulo-extrato" className="border-b-2 border-tinta pb-1 font-titulo text-lg font-bold uppercase">
          Entradas e saídas
        </h2>
        {movimentos.length === 0 ? (
          <p className="text-sm">Nenhum movimento ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="tabela w-full text-sm">
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>O quê</th>
                  <th>Tipo</th>
                  <th className="text-right">Dias</th>
                  <th>Anúncio</th>
                </tr>
              </thead>
              <tbody>
                {movimentos.map((m) => (
                  <tr key={m.id}>
                    <td className="whitespace-nowrap">{formatarDataHora(m.criadoEm)}</td>
                    <td>{MOTIVOS_DO_MOVIMENTO[m.motivo]}</td>
                    <td>{NOMES_DOS_TIPOS_DE_DIA[m.tipo].plural}</td>
                    <td className="text-right font-bold">{m.dias > 0 ? `+${m.dias}` : m.dias}</td>
                    <td>
                      {m.anuncio?.apagado ? (
                        // Feature 018 (RN-185): do apagado fica só o código.
                        <span className="text-tinta-suave">Anúncio apagado ({m.anuncio.codigo})</span>
                      ) : m.anuncio ? (
                        <Link href={`/minha-conta/anuncios/${m.anuncio.id}`} className="link">
                          {m.anuncio.titulo}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
