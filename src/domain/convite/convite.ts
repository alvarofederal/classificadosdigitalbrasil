// DOMÍNIO — convites de cortesia (feature 015: RF-250 a RF-256, RN-250 a RN-257).

import type { SaldoDoBanco, TipoDeDia } from "../banco/banco-de-dias"
import { type Carta, NOME_DO_JORNAL, primeiroNome } from "../shared/carta"

/** RN-250: convites por conta, para sempre (o vencido e o cancelado voltam). */
export const CONVITES_POR_CONTA = 5

/** RN-251 */
export const VALIDADE_DO_CONVITE_MS = 30 * 86_400_000

/** RF-254: o que quem convidou ganha quando o convidado publica o primeiro anúncio. */
export const PREMIO_DO_CONVITE: { tipo: TipoDeDia; dias: number } = { tipo: "FOTOS", dias: 7 }

export const CANAIS_DO_CONVITE = ["EMAIL", "WHATSAPP"] as const
export type CanalDoConvite = (typeof CANAIS_DO_CONVITE)[number]

export interface ConviteParaSituacao {
  expiraEm: Date
  aceitoEm: Date | null
  premiadoEm: Date | null
  canceladoEm: Date | null
}

export const SITUACOES_DO_CONVITE = {
  AGUARDANDO: "Aguardando o amigo",
  ACEITO: "Conta criada; falta o primeiro anúncio",
  PREMIADO: "Anúncio publicado; você ganhou os dias",
  VENCIDO: "Vencido; o convite voltou",
  CANCELADO: "Cancelado; o convite voltou",
} as const
export type SituacaoDoConvite = keyof typeof SITUACOES_DO_CONVITE

export function situacaoDoConvite(convite: ConviteParaSituacao, agora: Date): SituacaoDoConvite {
  if (convite.premiadoEm) return "PREMIADO"
  if (convite.aceitoEm) return "ACEITO"
  if (convite.canceladoEm) return "CANCELADO"
  return convite.expiraEm.getTime() <= agora.getTime() ? "VENCIDO" : "AGUARDANDO"
}

/** RN-250: ocupam vaga o convite aceito (premiado ou não) e o que ainda vale. */
export function convitesDisponiveis(convites: ConviteParaSituacao[], agora: Date): number {
  const ocupados = convites.filter((c) => ["AGUARDANDO", "ACEITO", "PREMIADO"].includes(situacaoDoConvite(c, agora))).length
  return Math.max(0, CONVITES_POR_CONTA - ocupados)
}

/** Pode aceitar? O convite precisa estar aguardando (nem aceito, nem cancelado, nem vencido). */
export function conviteAceitavel(convite: ConviteParaSituacao, agora: Date): boolean {
  return situacaoDoConvite(convite, agora) === "AGUARDANDO"
}

function fraseDoPresente(presente: SaldoDoBanco | null): string | null {
  if (!presente || presente.SIMPLES + presente.FOTOS === 0) return null
  return `Criando a conta, você ganha ${presente.SIMPLES} dias sem foto e ${presente.FOTOS} dias com foto para anunciar de graça.`
}

/** RF-251: a carta do convite por e-mail. Só o primeiro nome de quem convida (como na RN-125). */
export function montarCartaDoConvite(dados: { nomeDeQuemConvida: string; link: string; presente: SaldoDoBanco | null; expiraEm: Date }): Carta {
  const quem = primeiroNome(dados.nomeDeQuemConvida)
  const presente = fraseDoPresente(dados.presente)
  return {
    assunto: `${quem} convidou você para o ${NOME_DO_JORNAL}`,
    saudacao: "Olá.",
    paragrafos: [
      `${quem} anuncia no ${NOME_DO_JORNAL}, os classificados da sua cidade no formato do jornal, e convidou você.`,
      ...(presente ? [presente] : []),
      "O convite vale para este e-mail: crie a conta com ele.",
    ],
    citacao: null,
    linhas: [],
    botao: { rotulo: "Aceitar o convite", url: dados.link },
    observacoes: [
      `O convite vale até ${new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" }).format(dados.expiraEm)}.`,
      "Se você não conhece quem convidou, ignore este e-mail: nenhuma conta é criada sem você.",
    ],
    rodape: `Você recebeu este e-mail porque ${quem} informou este endereço ao convidar você para o ${NOME_DO_JORNAL}.`,
    responderPara: null,
  }
}

/** RF-252: o texto que abre no WhatsApp de quem convida. */
export function textoDoConviteNoWhatsApp(dados: { link: string; presente: SaldoDoBanco | null }): string {
  const presente = fraseDoPresente(dados.presente)
  return [`Estou anunciando no ${NOME_DO_JORNAL}, os classificados da cidade com cara de jornal.`, presente, `Este é o meu convite para você: ${dados.link}`]
    .filter(Boolean)
    .join(" ")
}
