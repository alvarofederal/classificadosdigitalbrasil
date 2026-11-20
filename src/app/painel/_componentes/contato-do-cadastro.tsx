// APRESENTAÇÃO — o e-mail de continuar ou desistir numa conta sem confirmação: o botão, ou quando saiu e quando a conta será
// apagada, com "Mandar de novo" (feature 024: RF-240, RF-246). Usado no Resumo e em Usuários.

import { prazoParaApagar } from "@/domain/usuario/cadastro-sem-confirmacao"
import { formatarDia } from "@/lib/formatadores"
import { mandarContinuarOuDesistirAction } from "../actions"
import { BotaoAcao } from "./botao-acao"

export function ContatoDoCadastro({ usuarioId, contatoEnviadoEm }: { usuarioId: string; contatoEnviadoEm: Date | null }) {
  const mandar = mandarContinuarOuDesistirAction.bind(null, usuarioId)
  if (!contatoEnviadoEm) return <BotaoAcao acao={mandar} rotulo="Mandar e-mail: continuar ou desistir" />
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="text-xs">
        E-mail mandado em {formatarDia(contatoEnviadoEm)}. Sem resposta, apaga em <strong>{formatarDia(prazoParaApagar(contatoEnviadoEm))}</strong>.
      </span>
      <BotaoAcao
        acao={mandar}
        rotulo="Mandar de novo"
        vazado
        confirmacao="Mandar o e-mail de novo? O link anterior deixa de valer e o prazo de 7 dias recomeça."
      />
    </span>
  )
}
