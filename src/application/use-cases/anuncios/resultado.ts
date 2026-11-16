// APLICAÇÃO — "Fechou negócio?": o dono conta o resultado do anúncio (feature 021: RF-210, RN-210 a RN-212).

import { type ResultadoDoAnuncio, ehResultadoDoAnuncio, podePerguntarResultado } from "@/domain/anuncio/resultado"
import { type Result, falha, falhaDeValidacao, ok } from "@/domain/shared/result"
import type { AnuncioRepository } from "../../ports/caderno"
import type { Relogio } from "../../ports/sistema"

export class RegistrarResultadoUseCase {
  constructor(
    private readonly anuncios: AnuncioRepository,
    private readonly relogio: Relogio,
  ) {}

  /** RN-211: só o dono; vale a última resposta. RN-212: não muda a situação do anúncio. */
  async executar(entrada: { usuarioId: string; anuncioId: string; resultado: string }): Promise<Result<ResultadoDoAnuncio>> {
    const anuncio = await this.anuncios.buscarPorId(entrada.anuncioId)
    if (!anuncio || anuncio.usuarioId !== entrada.usuarioId) return falha("NAO_ENCONTRADO", "Anúncio não encontrado.")
    // RN-210
    if (!podePerguntarResultado(anuncio)) return falha("SEM_RESULTADO", "Este anúncio ainda não esteve no caderno.")
    if (!ehResultadoDoAnuncio(entrada.resultado)) return falhaDeValidacao({ resultado: "Escolha uma das respostas." })
    await this.anuncios.registrarResultado(anuncio.id, entrada.resultado, this.relogio.agora())
    return ok(entrada.resultado)
  }
}
