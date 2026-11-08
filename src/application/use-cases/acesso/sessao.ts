// APLICAÇÃO — ler e encerrar a sessão do cookie (RF-02, RN-03).

import type { GeradorDeToken, SessaoRepository, UsuarioDaSessao } from "../../ports/acesso"
import type { Relogio } from "../../ports/sistema"
import { DURACAO_DA_SESSAO_MS } from "./autenticar-usuario"

/** A sessão é renovada (janela deslizante) quando passa um dia desde a última renovação. */
const RENOVAR_QUANDO_RESTAR_MS = DURACAO_DA_SESSAO_MS - 24 * 60 * 60 * 1000

export class ObterSessaoUseCase {
  constructor(
    private readonly sessoes: SessaoRepository,
    private readonly tokens: GeradorDeToken,
    private readonly relogio: Relogio,
  ) {}

  async executar(token: string | null | undefined): Promise<UsuarioDaSessao | null> {
    if (!token) return null
    const agora = this.relogio.agora()
    const sessao = await this.sessoes.buscarValida(this.tokens.hash(token), agora)
    if (!sessao || !sessao.usuario.ativo) return null

    if (sessao.expiraEm.getTime() - agora.getTime() < RENOVAR_QUANDO_RESTAR_MS) {
      await this.sessoes.renovar(sessao.sessaoId, new Date(agora.getTime() + DURACAO_DA_SESSAO_MS))
    }
    const { ativo: _ativo, ...usuario } = sessao.usuario
    return usuario
  }
}

export class EncerrarSessaoUseCase {
  constructor(
    private readonly sessoes: SessaoRepository,
    private readonly tokens: GeradorDeToken,
  ) {}

  async executar(token: string | null | undefined): Promise<void> {
    if (token) await this.sessoes.remover(this.tokens.hash(token))
  }
}
