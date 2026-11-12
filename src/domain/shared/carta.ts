// DOMÍNIO — carta: o conteúdo de um e-mail do site, sem HTML (feature 010, ADR-15).
// Quem monta a carta decide o que dizer; a cara do e-mail fica na infraestrutura (infrastructure/email/modelo.ts).

/** Nome do site que assina os e-mails. */
export const NOME_DO_JORNAL = "Classificados Digitais do Brasil"

/** Saudação pelo primeiro nome: do cadastro, só ele entra na carta (RN-102, RN-125). */
export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? ""
}

export interface Destinatario {
  nome: string
  email: string
}

export interface LinhaDaCarta {
  rotulo: string
  valor: string
  /** Endereço https ou mailto; null quando a linha é só texto. */
  link: string | null
}

export interface Carta {
  assunto: string
  saudacao: string
  /** Parágrafos antes da citação. */
  paragrafos: string[]
  /** Texto escrito por outra pessoa, mostrado em caixa e sempre como texto (RN-103). */
  citacao: { autor: string; texto: string } | null
  /** Linhas "rótulo: valor", como o contato para responder. */
  linhas: LinhaDaCarta[]
  botao: { rotulo: string; url: string } | null
  /** Avisos em letra menor, depois do botão. */
  observacoes: string[]
  /** Por que a pessoa recebeu este e-mail. */
  rodape: string
  /** Para quem vai a resposta de quem recebe; null = sem endereço de resposta. */
  responderPara: Destinatario | null
}
