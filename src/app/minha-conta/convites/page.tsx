// APRESENTAÇÃO — convites de cortesia (feature 015: RF-250 a RF-255).

import type { Metadata } from "next"
import { Faixa } from "@/components/jornal/pecas"
import { CONVITES_POR_CONTA, PREMIO_DO_CONVITE, SITUACOES_DO_CONVITE, convitesDisponiveis, situacaoDoConvite } from "@/domain/convite/convite"
import { container } from "@/infrastructure/container"
import { formatarDia } from "@/lib/formatadores"
import { exigirPerfil } from "@/lib/sessao"
import { BotaoCancelarConvite, BotaoConvidarPeloWhatsApp, FormularioConviteEmail } from "../_componentes/convites"

export const metadata: Metadata = { title: "Convites", robots: { index: false } }

export default async function Convites() {
  const usuario = await exigirPerfil("ANUNCIANTE")
  const c = container()
  const agora = c.relogio.agora()
  const [convites, ligados] = await Promise.all([c.minhaConta.convites(usuario.id), c.configuracao.convitesLigados()])
  const disponiveis = convitesDisponiveis(convites, agora)
  const semConvite = !ligados || disponiveis === 0

  return (
    <div className="flex flex-col gap-5">
      <Faixa como="h1">Convites</Faixa>
      <section className="flex flex-col gap-3 border-2 border-tinta p-4">
        <p>
          Você tem <strong>{disponiveis}</strong> de {CONVITES_POR_CONTA} convites. Quando o amigo cria a conta pelo seu convite e publica o primeiro anúncio, com ou
          sem foto, você ganha <strong>{PREMIO_DO_CONVITE.dias} dias com foto</strong> no banco de dias.
        </p>
        <p className="text-sm">O convite vale 30 dias. O que vence ou é cancelado sem ser usado volta para você.</p>
        {!ligados && <p className="text-sm font-bold">Os convites estão suspensos no momento.</p>}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-8">
          <div className="flex flex-col gap-2">
            <BotaoConvidarPeloWhatsApp desabilitado={semConvite} />
            <p className="text-xs text-tinta-suave">Abre o seu WhatsApp com o texto e o link; vale para quem tiver o link.</p>
          </div>
          <div className="flex-1">
            <FormularioConviteEmail desabilitado={semConvite} />
            <p className="mt-1 text-xs text-tinta-suave">Pelo e-mail, o convite só vale para a conta criada com aquele e-mail.</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="titulo-enviados" className="flex flex-col gap-3">
        <h2 id="titulo-enviados" className="border-b-2 border-tinta pb-1 font-titulo text-lg font-bold uppercase">
          Convites enviados
        </h2>
        {convites.length === 0 ? (
          <p className="text-sm">Nenhum convite ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="tabela w-full text-sm">
              <thead>
                <tr>
                  <th>Enviado em</th>
                  <th>Por</th>
                  <th>Para</th>
                  <th>Situação</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {convites.map((convite) => {
                  const situacao = situacaoDoConvite(convite, agora)
                  return (
                    <tr key={convite.id}>
                      <td className="whitespace-nowrap">{formatarDia(convite.criadoEm)}</td>
                      <td>{convite.canal === "EMAIL" ? "E-mail" : "WhatsApp"}</td>
                      <td className="break-all">{convite.convidado ?? convite.emailDestino ?? "quem tiver o link"}</td>
                      <td>
                        {SITUACOES_DO_CONVITE[situacao]}
                        {situacao === "AGUARDANDO" && <span className="text-tinta-suave"> · vale até {formatarDia(convite.expiraEm)}</span>}
                      </td>
                      <td>{situacao === "AGUARDANDO" && <BotaoCancelarConvite conviteId={convite.id} />}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
