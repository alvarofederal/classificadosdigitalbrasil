// APLICAÇÃO — login com e-mail e senha (RF-02, RN-03).

import { type Result, falha, ok } from "@/domain/shared/result"
import type { Perfil } from "@/domain/usuario/usuario"
import type { GeradorDeToken, HashDeSenha, SessaoRepository, TentativaLoginRepository, UsuarioRepository } from "../../ports/acesso"
import type { Relogio } from "../../ports/sistema"

export const MAXIMO_FALHAS_DE_LOGIN = 10
export const JANELA_DE_FALHAS_MS = 15 * 60 * 1000
export const DURACAO_DA_SESSAO_MS = 30 * 24 * 60 * 60 * 1000

export interface EntradaLogin {
  email: string
  senha: string
  ip: string
}

export interface SessaoCriada {
  token: string
  expiraEm: Date
  perfil: Perfil
  deveTrocarSenha: boolean
}

/** Cria a sessão de um usuário já identificado (login e cadastro usam o mesmo caminho). */
export async function abrirSessao(
  deps: { sessoes: SessaoRepository; tokens: GeradorDeToken; relogio: Relogio },
  usuarioId: string,
): Promise<{ token: string; expiraEm: Date }> {
  const token = deps.tokens.novoToken()
  const expiraEm = new Date(deps.relogio.agora().getTime() + DURACAO_DA_SESSAO_MS)
  await deps.sessoes.criar({ usuarioId, tokenHash: deps.tokens.hash(token), expiraEm })
  return { token, expiraEm }
}

export class AutenticarUsuarioUseCase {
  /** Hash de uma senha qualquer: comparar contra ele iguala o tempo de resposta quando o e-mail não existe. */
  private hashDeDisfarce?: Promise<string>

  constructor(
    private readonly usuarios: UsuarioRepository,
    private readonly sessoes: SessaoRepository,
    private readonly tentativas: TentativaLoginRepository,
    private readonly hash: HashDeSenha,
    private readonly tokens: GeradorDeToken,
    private readonly relogio: Relogio,
  ) {}

  async executar(entrada: EntradaLogin): Promise<Result<SessaoCriada>> {
    const agora = this.relogio.agora()
    const email = entrada.email.trim().toLowerCase()

    const falhasRecentes = await this.tentativas.contarFalhasDesde(entrada.ip, new Date(agora.getTime() - JANELA_DE_FALHAS_MS))
    if (falhasRecentes >= MAXIMO_FALHAS_DE_LOGIN) {
      return falha("MUITAS_TENTATIVAS", "Muitas tentativas de login. Tente novamente em 15 minutos.")
    }

    const usuario = email ? await this.usuarios.buscarPorEmail(email) : null
    this.hashDeDisfarce ??= this.hash.gerar("senha-de-disfarce-1")
    const senhaConfere = await this.hash.comparar(entrada.senha, usuario?.senhaHash ?? (await this.hashDeDisfarce))

    if (!usuario || !senhaConfere || !usuario.ativo) {
      await this.tentativas.registrar({ email, ip: entrada.ip, sucesso: false })
      // Mesma mensagem para e-mail inexistente, senha errada e conta desativada.
      return falha("CREDENCIAIS_INVALIDAS", "E-mail ou senha incorretos.")
    }

    const sessao = await abrirSessao({ sessoes: this.sessoes, tokens: this.tokens, relogio: this.relogio }, usuario.id)
    await this.tentativas.registrar({ email, ip: entrada.ip, sucesso: true })
    await this.usuarios.registrarAcesso(usuario.id, agora)

    return ok({ ...sessao, perfil: usuario.perfil, deveTrocarSenha: usuario.deveTrocarSenha })
  }
}
