// DOMÍNIO — mensagem de quem viu o anúncio para o anunciante (RF-17, RN-17, RN-18).

import type { ErrosDeCampo } from "../shared/result"
import { somenteDigitos, validarTamanho } from "../shared/texto"

export const LIMITES_DA_MENSAGEM = {
  nomeMax: 80,
  contatoMax: 120,
  textoMin: 5,
  textoMax: 1000,
  /** Mensagens do mesmo contato para o mesmo anúncio em 24 h. */
  porContatoPorDia: 3,
} as const

export interface NovaMensagem {
  nome: string
  contato: string
  texto: string
}

/** O contato precisa permitir a resposta: e-mail ou telefone com DDD. */
export function contatoValido(contato: string): boolean {
  if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contato)) return true
  const digitos = somenteDigitos(contato)
  return digitos.length >= 10 && digitos.length <= 13 && !/[a-z]/i.test(contato)
}

export function normalizarMensagem(mensagem: NovaMensagem): NovaMensagem {
  return {
    nome: mensagem.nome.trim().replace(/\s+/g, " "),
    contato: mensagem.contato.trim(),
    texto: mensagem.texto.replace(/\r\n?/g, "\n").trim(),
  }
}

export function validarMensagem(mensagem: NovaMensagem): ErrosDeCampo {
  const erros: ErrosDeCampo = {}
  validarTamanho(mensagem.nome, "nome", "seu nome", { min: 2, max: LIMITES_DA_MENSAGEM.nomeMax }, erros)
  if (mensagem.contato.length > LIMITES_DA_MENSAGEM.contatoMax || !contatoValido(mensagem.contato)) {
    erros.contato = "Informe um telefone com DDD ou um e-mail."
  }
  validarTamanho(mensagem.texto, "texto", "a mensagem", { min: LIMITES_DA_MENSAGEM.textoMin, max: LIMITES_DA_MENSAGEM.textoMax }, erros)
  return erros
}
