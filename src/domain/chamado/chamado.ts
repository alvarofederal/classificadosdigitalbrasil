// DOMÍNIO — chamado de contato para o administrador (feature 004: RF-60 a RF-62, RN-60, RN-61).

import { codigoValido } from "../anuncio/anuncio"
import type { ErrosDeCampo } from "../shared/result"
import { somenteDigitos, validarTamanho } from "../shared/texto"
import { emailValido } from "../usuario/usuario"

export const ASSUNTOS = {
  DUVIDA: "Dúvida",
  SUPORTE: "Suporte",
  PAGAMENTO: "Pagamento",
  DENUNCIA: "Denúncia de anúncio",
  SUGESTAO: "Sugestão",
  OUTRO: "Outro",
} as const

export type Assunto = keyof typeof ASSUNTOS

export const SITUACOES_DO_CHAMADO = { ABERTO: "Aberto", RESOLVIDO: "Resolvido" } as const
export type SituacaoDoChamado = keyof typeof SITUACOES_DO_CHAMADO

export const LIMITES_DO_CHAMADO = { mensagemMin: 10, mensagemMax: 2000, porEmailPorHora: 5 } as const

export const ALFABETO_DO_PROTOCOLO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
export const TAMANHO_DO_PROTOCOLO = 8

export interface NovoChamado {
  nome: string
  email: string
  telefone: string
  assunto: string
  mensagem: string
  anuncioCodigo: string | null
}

export function normalizarChamado(c: NovoChamado): NovoChamado {
  const codigo = (c.anuncioCodigo ?? "").trim().toUpperCase()
  return {
    nome: c.nome.trim().replace(/\s+/g, " "),
    email: c.email.trim().toLowerCase(),
    telefone: somenteDigitos(c.telefone),
    assunto: c.assunto.trim().toUpperCase(),
    mensagem: c.mensagem.replace(/\r\n?/g, "\n").trim(),
    anuncioCodigo: codigo || null,
  }
}

export function validarChamado(c: NovoChamado): ErrosDeCampo {
  const erros: ErrosDeCampo = {}
  validarTamanho(c.nome, "nome", "seu nome", { min: 2, max: 80 }, erros)
  if (!emailValido(c.email)) erros.email = "Informe um e-mail válido para a resposta."
  if (c.telefone && (c.telefone.length < 10 || c.telefone.length > 13)) erros.telefone = "Telefone com DDD, ou deixe em branco."
  if (!(c.assunto in ASSUNTOS)) erros.assunto = "Escolha o assunto."
  validarTamanho(c.mensagem, "mensagem", "a mensagem", { min: LIMITES_DO_CHAMADO.mensagemMin, max: LIMITES_DO_CHAMADO.mensagemMax }, erros)
  if (c.anuncioCodigo && !codigoValido(c.anuncioCodigo)) erros.anuncioCodigo = "Código de anúncio inválido (6 letras e números)."
  return erros
}
