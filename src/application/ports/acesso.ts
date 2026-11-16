// APLICAÇÃO — portas de acesso: usuários, sessões, tentativas de login e segredos.

import type { FinalidadeDoCodigo } from "@/domain/usuario/codigo-por-email"
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
  /** Feature 016: nulo enquanto o e-mail não foi confirmado pelo código (RF-150). */
  emailConfirmadoEm: Date | null
}

export type NovoUsuario = Omit<UsuarioRegistro, "id">

export interface UsuarioRepository {
  buscarPorId(id: string): Promise<UsuarioRegistro | null>
  buscarPorEmail(email: string): Promise<UsuarioRegistro | null>
  /** RN-01 com RN-155: compara pelo e-mail canônico, então "fulano+x@gmail.com" acha "fulano@gmail.com". */
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
  /** RF-151: sem a confirmação, a conta só vê a tela do código. */
  emailConfirmado: boolean
}

// ── Código por e-mail (feature 016) ──

export interface CodigoPorEmailRegistro {
  id: string
  usuarioId: string
  finalidade: FinalidadeDoCodigo
  /** Para onde o código foi: o e-mail da conta, ou o novo na troca de e-mail. */
  email: string
  /** RN-150: só o hash do código fica no banco. */
  codigoHash: string
  tentativas: number
  expiraEm: Date
  /** Usado, ou invalidado por um código mais novo (RN-152, RN-153). */
  encerradoEm: Date | null
  criadoEm: Date
}

export interface CodigoPorEmailRepository {
  inserir(codigo: Omit<CodigoPorEmailRegistro, "id">): Promise<string>
  /** O mais recente ainda não encerrado, vencido ou não. */
  emAberto(usuarioId: string, finalidade: FinalidadeDoCodigo): Promise<CodigoPorEmailRegistro | null>
  /** Quando saíram os códigos desta finalidade desde o instante dado, para os limites da RN-152. */
  criadosDesde(usuarioId: string, finalidade: FinalidadeDoCodigo, desde: Date): Promise<Date[]>
  encerrarEmAberto(usuarioId: string, finalidade: FinalidadeDoCodigo, quando: Date): Promise<void>
  /** Soma uma tentativa errada e devolve quantas já foram (RN-151). */
  somarTentativa(id: string): Promise<number>
  /** Encerra só se ainda estiver aberto; falso = outro pedido usou antes (RN-153). */
  encerrar(id: string, quando: Date): Promise<boolean>
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
