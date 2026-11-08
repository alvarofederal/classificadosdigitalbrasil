// APLICAÇÃO — portas de acesso: usuários, sessões, tentativas de login e segredos.

import type { Perfil } from "@/domain/usuario/usuario"

export interface UsuarioRegistro {
  id: string
  nome: string
  cpf: string | null
  email: string
  celular: string
  uf: string
  cidadeCodigo: number
  senhaHash: string
  perfil: Perfil
  ativo: boolean
  deveTrocarSenha: boolean
  aceitouTermosEm: Date | null
}

export type NovoUsuario = Omit<UsuarioRegistro, "id">

export interface UsuarioRepository {
  buscarPorId(id: string): Promise<UsuarioRegistro | null>
  buscarPorEmail(email: string): Promise<UsuarioRegistro | null>
  existeEmail(email: string, excetoUsuarioId?: string): Promise<boolean>
  existeCpf(cpf: string): Promise<boolean>
  inserir(usuario: NovoUsuario): Promise<string>
  atualizar(usuario: UsuarioRegistro): Promise<void>
  registrarAcesso(usuarioId: string, quando: Date): Promise<void>
}

/** O que a apresentação precisa saber de quem está logado. */
export interface UsuarioDaSessao {
  id: string
  nome: string
  email: string
  perfil: Perfil
  deveTrocarSenha: boolean
}

export interface SessaoValida {
  sessaoId: string
  expiraEm: Date
  usuario: UsuarioDaSessao & { ativo: boolean }
}

export interface SessaoRepository {
  criar(params: { usuarioId: string; tokenHash: string; expiraEm: Date }): Promise<void>
  buscarValida(tokenHash: string, agora: Date): Promise<SessaoValida | null>
  renovar(sessaoId: string, expiraEm: Date): Promise<void>
  remover(tokenHash: string): Promise<void>
  removerTodasDoUsuario(usuarioId: string, excetoTokenHash?: string): Promise<void>
}

export interface TentativaLoginRepository {
  registrar(params: { email: string; ip: string; sucesso: boolean }): Promise<void>
  contarFalhasDesde(ip: string, desde: Date): Promise<number>
}

export interface HashDeSenha {
  gerar(senha: string): Promise<string>
  comparar(senha: string, hash: string): Promise<boolean>
}

export interface GeradorDeToken {
  /** Token aleatório que vai no cookie. */
  novoToken(): string
  /** Hash do token — é o que fica no banco. */
  hash(token: string): string
}
