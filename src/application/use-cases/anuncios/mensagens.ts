// APLICAÇÃO — mensagem de quem viu o anúncio (RF-17, RF-23, RN-17, RN-18).

import { estaNoAr } from "@/domain/anuncio/anuncio"
import { LIMITES_DA_MENSAGEM, type NovaMensagem, normalizarMensagem, validarMensagem } from "@/domain/mensagem/mensagem"
import { type Result, falha, falhaDeValidacao, ok } from "@/domain/shared/result"
import type { AnuncioRepository, MensagemRepository } from "../../ports/caderno"
import type { Relogio } from "../../ports/sistema"
import type { Ator } from "./gerenciar-anuncios"

export class EnviarMensagemUseCase {
  constructor(
    private readonly anuncios: AnuncioRepository,
    private readonly mensagens: MensagemRepository,
    private readonly relogio: Relogio,
  ) {}

  async executar(anuncioId: string, entrada: NovaMensagem): Promise<Result<true>> {
    const agora = this.relogio.agora()
    const anuncio = await this.anuncios.buscarPorId(anuncioId)
    // RN-17: só anúncio no ar recebe mensagem.
    if (!anuncio || !estaNoAr(anuncio.situacao, anuncio.expiraEm, agora)) return falha("NAO_DISPONIVEL", "Este anúncio não está mais no ar.")

    const mensagem = normalizarMensagem(entrada)
    const erros = validarMensagem(mensagem)
    if (Object.keys(erros).length > 0) return falhaDeValidacao(erros)

    // RN-18: freio contra repetição do mesmo contato.
    const recentes = await this.mensagens.contarDoContatoDesde(anuncio.id, mensagem.contato, new Date(agora.getTime() - 86_400_000))
    if (recentes >= LIMITES_DA_MENSAGEM.porContatoPorDia) {
      return falha("MUITAS_MENSAGENS", "Você já enviou mensagens para este anúncio hoje. Aguarde a resposta do anunciante.")
    }
    await this.mensagens.inserir(anuncio.id, mensagem)
    return ok(true)
  }
}

export class MarcarMensagensLidasUseCase {
  constructor(
    private readonly anuncios: AnuncioRepository,
    private readonly mensagens: MensagemRepository,
  ) {}

  /** Só o dono marca como lidas: o administrador olhando o anúncio não apaga o aviso de "nova mensagem". */
  async executar(ator: Ator, anuncioId: string): Promise<void> {
    const anuncio = await this.anuncios.buscarPorId(anuncioId)
    if (anuncio && anuncio.usuarioId === ator.usuarioId) await this.mensagens.marcarComoLidas(anuncio.id)
  }
}
