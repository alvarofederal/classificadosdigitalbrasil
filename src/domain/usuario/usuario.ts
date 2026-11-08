// DOMÍNIO — anunciante e administrador: dados pessoais e senha (RF-01, RN-01 a RN-04).

import type { ErrosDeCampo } from "../shared/result"
import { somenteDigitos, validarTamanho } from "../shared/texto"
import { ehUF } from "../localidade/uf"
import { cpfValido } from "./cpf"

export const PERFIS = {
  ANUNCIANTE: "Anunciante",
  ADMIN: "Administrador",
} as const

export type Perfil = keyof typeof PERFIS

export const SENHA_MINIMA = 8
export const SENHA_MAXIMA = 72 // limite do bcrypt

export interface DadosPessoais {
  nome: string
  email: string
  celular: string
  uf: string
  cidadeCodigo: number
}

export interface DadosDeCadastro extends DadosPessoais {
  cpf: string
  senha: string
  confirmacaoSenha: string
  aceitouTermos: boolean
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function emailValido(email: string): boolean {
  return email.length <= 160 && EMAIL.test(email)
}

/** Celular com DDD: 10 ou 11 dígitos, DDD entre 11 e 99. */
export function celularValido(celular: string): boolean {
  const d = somenteDigitos(celular)
  return (d.length === 10 || d.length === 11) && Number(d.slice(0, 2)) >= 11
}

export function formatarCelular(celular: string): string {
  const d = somenteDigitos(celular)
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return celular
}

export function normalizarDadosPessoais<T extends DadosPessoais>(dados: T): T {
  return {
    ...dados,
    nome: dados.nome.trim().replace(/\s+/g, " "),
    email: dados.email.trim().toLowerCase(),
    celular: somenteDigitos(dados.celular),
    uf: dados.uf.trim().toUpperCase(),
  }
}

/** Formato dos dados pessoais. Se a cidade pertence à UF é conferido pelo caso de uso (catálogo do IBGE). */
export function validarDadosPessoais(dados: DadosPessoais, erros: ErrosDeCampo = {}): ErrosDeCampo {
  validarTamanho(dados.nome, "nome", "o nome", { min: 3, max: 120 }, erros)
  if (!erros.nome && !/\s/.test(dados.nome)) erros.nome = "Informe nome e sobrenome."
  if (!emailValido(dados.email)) erros.email = "Informe um e-mail válido."
  if (!celularValido(dados.celular)) erros.celular = "Informe o celular com DDD."
  if (!ehUF(dados.uf)) erros.uf = "Escolha o estado."
  if (!Number.isInteger(dados.cidadeCodigo) || dados.cidadeCodigo <= 0) erros.cidadeCodigo = "Escolha a cidade."
  return erros
}

export function validarNovaSenha(senha: string, confirmacao: string, erros: ErrosDeCampo = {}, campo = "senha"): ErrosDeCampo {
  if (senha.length < SENHA_MINIMA) erros[campo] = `A senha precisa de pelo menos ${SENHA_MINIMA} caracteres.`
  else if (senha.length > SENHA_MAXIMA) erros[campo] = `A senha pode ter no máximo ${SENHA_MAXIMA} caracteres.`
  else if (senha !== confirmacao) erros.confirmacaoSenha = "As senhas não conferem."
  return erros
}

export function validarCadastro(dados: DadosDeCadastro): ErrosDeCampo {
  const erros = validarDadosPessoais(dados)
  if (!cpfValido(dados.cpf)) erros.cpf = "CPF inválido."
  validarNovaSenha(dados.senha, dados.confirmacaoSenha, erros)
  if (!dados.aceitouTermos) erros.aceitouTermos = "É preciso aceitar os termos de uso e a política de privacidade."
  return erros
}
