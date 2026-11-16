// DOMÍNIO — código por e-mail: confirmar o cadastro, trocar o e-mail e criar senha nova (feature 016: RN-150 a RN-159).
// O número aleatório vem da porta GeradorDeCodigo; aqui ficam as regras, o e-mail canônico e as cartas.

import { type Carta, NOME_DO_JORNAL, primeiroNome } from "../shared/carta"

/** RN-153: cada código serve a uma finalidade e a um uso. */
export const FINALIDADES_DO_CODIGO = ["CADASTRO", "TROCA_DE_EMAIL", "NOVA_SENHA"] as const
export type FinalidadeDoCodigo = (typeof FINALIDADES_DO_CODIGO)[number]

/** RN-150: 6 números, válido por 15 minutos. */
export const DIGITOS_DO_CODIGO = "0123456789"
export const TAMANHO_DO_CODIGO = 6
export const VALIDADE_DO_CODIGO_MS = 15 * 60_000
/** RN-151 */
export const TENTATIVAS_POR_CODIGO = 5
/** RN-152 */
export const INTERVALO_ENTRE_CODIGOS_MS = 60_000
export const CODIGOS_POR_HORA = 5

/** O que a pessoa digitou, só com os números: "123 456" e "123-456" valem. */
export function normalizarCodigo(digitado: string): string {
  return digitado.replace(/\D/g, "")
}

export function codigoNoFormato(codigo: string): boolean {
  return new RegExp(`^\\d{${TAMANHO_DO_CODIGO}}$`).test(codigo)
}

const DOMINIOS_DO_GMAIL = new Set(["gmail.com", "googlemail.com"])

/**
 * RN-155: a forma do e-mail que conta para "um e-mail por conta". O que vem depois do "+" não conta em nenhum domínio;
 * no Gmail, os pontos também não. A migration `20261115220000_codigo_por_email` repete esta regra em SQL.
 */
export function emailCanonico(email: string): string {
  const limpo = email.trim().toLowerCase()
  const arroba = limpo.lastIndexOf("@")
  if (arroba <= 0) return limpo
  let local = limpo.slice(0, arroba)
  let dominio = limpo.slice(arroba + 1)
  const mais = local.indexOf("+")
  if (mais > 0) local = local.slice(0, mais)
  if (DOMINIOS_DO_GMAIL.has(dominio)) {
    local = local.replace(/\./g, "")
    dominio = "gmail.com"
  }
  return `${local}@${dominio}`
}

/** "fulano@gmail.com" → "fu***@gmail.com": o aviso de troca mostra para onde foi sem expor o endereço inteiro. */
export function mascararEmail(email: string): string {
  const [local = "", dominio = ""] = email.split("@")
  return `${local.slice(0, 2)}***@${dominio}`
}

/** Segundos que faltam para poder pedir outro código (RN-152); 0 = pode. */
export function segundosParaOutroCodigo(ultimoEnvio: Date | null, agora: Date): number {
  if (!ultimoEnvio) return 0
  const falta = ultimoEnvio.getTime() + INTERVALO_ENTRE_CODIGOS_MS - agora.getTime()
  return falta > 0 ? Math.ceil(falta / 1000) : 0
}

const PARA_QUE_SERVE: Record<FinalidadeDoCodigo, { assunto: string; frase: string }> = {
  CADASTRO: {
    assunto: "Código para confirmar seu e-mail",
    frase: `Use o código abaixo para confirmar seu e-mail e liberar sua conta no ${NOME_DO_JORNAL}.`,
  },
  TROCA_DE_EMAIL: {
    assunto: "Código para confirmar o e-mail novo",
    frase: "Use o código abaixo para confirmar este endereço como o novo e-mail da sua conta.",
  },
  NOVA_SENHA: {
    assunto: "Código para criar uma senha nova",
    frase: "Use o código abaixo para criar uma senha nova para a sua conta.",
  },
}

/** RN-159: só o primeiro nome, para que serve e o lembrete de não passar o código a ninguém. */
export function montarCartaDoCodigo(dados: { nome: string; codigo: string; finalidade: FinalidadeDoCodigo }): Carta {
  const uso = PARA_QUE_SERVE[dados.finalidade]
  return {
    assunto: `${uso.assunto}: ${dados.codigo}`,
    saudacao: `Olá, ${primeiroNome(dados.nome)}.`,
    paragrafos: [uso.frase, `O código vale por ${VALIDADE_DO_CODIGO_MS / 60_000} minutos.`],
    destaque: dados.codigo,
    citacao: null,
    linhas: [],
    botao: null,
    observacoes: [
      "Se não foi você que pediu, ignore este e-mail: sem o código, nada muda na conta.",
      "O Classificados nunca pede este código por telefone, WhatsApp ou mensagem. Não passe o código para ninguém.",
    ],
    rodape: `Você recebeu este e-mail porque este endereço foi informado no ${NOME_DO_JORNAL}.`,
    responderPara: null,
  }
}

const QUANDO = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
})

/** RF-155: o endereço antigo fica sabendo da troca. */
export function montarAvisoDeEmailTrocado(dados: { nome: string; emailNovo: string; quando: Date; linkDoContato: string }): Carta {
  return {
    assunto: "O e-mail da sua conta foi trocado",
    saudacao: `Olá, ${primeiroNome(dados.nome)}.`,
    paragrafos: [
      `O e-mail da sua conta no ${NOME_DO_JORNAL} foi trocado para ${mascararEmail(dados.emailNovo)} em ${QUANDO.format(dados.quando).replace(", ", ", às ")}.`,
      "Os avisos de mensagem e de vencimento passam a ir para o endereço novo.",
    ],
    citacao: null,
    linhas: [],
    botao: null,
    observacoes: [`Se não foi você, fale com a gente o quanto antes: ${dados.linkDoContato}`],
    rodape: `Você recebeu este aviso porque este era o e-mail da sua conta no ${NOME_DO_JORNAL}.`,
    responderPara: null,
  }
}
