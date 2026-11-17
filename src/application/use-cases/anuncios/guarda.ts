// APLICAÇÃO — rodada diária dos vencidos: apaga mensagens aos 90 dias e anúncios aos 180, e avisa o dono 7 dias antes
// (feature 018: RF-182, RF-183, RN-183 a RN-189; ADR-24).

import { APAGADOS_POR_RODADA, AVISOS_DE_APAGAR_POR_RODADA, cortesDaRodada, montarAvisoDeApagar } from "@/domain/anuncio/guarda"
import { podeReceberEmail } from "@/domain/anuncio/vencimento"
import { type Result, falha } from "@/domain/shared/result"
import type { AnuncioParaAvisarAntesDeApagar, FotoStorage, GatewayPix, GuardaDosVencidosRepository, PagamentoRepository } from "../../ports/caderno"
import type { Correio, EnderecosDoSite } from "../../ports/correio"
import type { Relogio } from "../../ports/sistema"
import { cancelarNoGateway } from "../pagamentos/pagamentos"

export interface ResumoDaLimpeza {
  /** RN-183: mensagens apagadas de anúncios vencidos há mais de 90 dias. */
  mensagensApagadas: number
  encontrados: number
  apagados: number
  /** RN-186: Pix já pago, ou anúncio renovado entre a busca e a gravação. */
  adiados: number
  falhas: number
  /** RN-185: fotos mandadas para apagar no Cloudinary. */
  fotosApagadas: number
}

/** RF-182: apaga as mensagens vencidas e os anúncios guardados há 180 dias. */
export class ApagarVencidosUseCase {
  constructor(
    private readonly guarda: GuardaDosVencidosRepository,
    private readonly pagamentos: PagamentoRepository,
    /** null = sem Pix automático: não há cobrança para cancelar no gateway. */
    private readonly gateway: GatewayPix | null,
    private readonly storage: FotoStorage,
    private readonly relogio: Relogio,
  ) {}

  async executar(): Promise<ResumoDaLimpeza> {
    const agora = this.relogio.agora()
    const cortes = cortesDaRodada(agora)
    const resumo: ResumoDaLimpeza = { mensagensApagadas: 0, encontrados: 0, apagados: 0, adiados: 0, falhas: 0, fotosApagadas: 0 }

    // RN-183: uma instrução, condicionada ao anúncio ainda vencido (ADR-24).
    resumo.mensagensApagadas = await this.guarda.apagarMensagensDeVencidos(cortes.mensagensVencidasAte)

    const aApagar = await this.guarda.aApagar(cortes, APAGADOS_POR_RODADA)
    resumo.encontrados = aApagar.length
    for (const anuncio of aApagar) {
      try {
        // RN-186: a cobrança em aberto deixa de ser pagável; se o Pix já foi pago, a confirmação vem e o anúncio fica.
        const pendente = await this.pagamentos.pendenteDoAnuncio(anuncio.id)
        if (pendente) {
          if ((await cancelarNoGateway(this.gateway, pendente)) === "JA_PAGA") {
            resumo.adiados++
            continue
          }
          await this.pagamentos.cancelarPendentesDoAnuncio(anuncio.id)
        }
        const apagado = await this.guarda.apagar(anuncio.id, cortes, agora)
        if (!apagado) {
          resumo.adiados++
          continue
        }
        resumo.apagados++
        // RN-185: as fotos saem do Cloudinary depois da gravação; a falha lá vai para o log e só sobra o arquivo sem uso.
        if (apagado.publicIds.length > 0) {
          await this.storage.remover(apagado.publicIds)
          resumo.fotosApagadas += apagado.publicIds.length
        }
      } catch (erro) {
        // Um anúncio com problema não para a rodada; no log, só o código.
        resumo.falhas++
        console.error("[vencidos] não apagado", anuncio.codigo, erro instanceof Error ? erro.message : String(erro))
      }
    }
    return resumo
  }
}

export interface ResumoDosAvisosDeApagar {
  /** Falso quando falta o servidor de e-mail (RN-187). */
  ligado: boolean
  encontrados: number
  enviados: number
  /** Conta desativada ou endereço de teste (RN-122). */
  ignorados: number
  falhas: number
}

/** RF-183: e-mail 7 dias antes de o vencido ser apagado, com o mesmo desenho do aviso de vencimento (ADR-17). */
export class AvisarAntesDeApagarUseCase {
  constructor(
    private readonly guarda: GuardaDosVencidosRepository,
    private readonly correio: Correio,
    private readonly relogio: Relogio,
    private readonly enderecos: EnderecosDoSite,
  ) {}

  async executar(): Promise<ResumoDosAvisosDeApagar> {
    const resumo: ResumoDosAvisosDeApagar = { ligado: this.correio.ligado, encontrados: 0, enviados: 0, ignorados: 0, falhas: 0 }
    // RN-187: sem servidor de e-mail, nada é enviado nem marcado.
    if (!this.correio.ligado) return resumo

    const cortes = cortesDaRodada(this.relogio.agora())
    const aAvisar = await this.guarda.aAvisar({ vencidosAte: cortes.vencidosAte, avisarAte: cortes.avisarVencidosAte }, AVISOS_DE_APAGAR_POR_RODADA)
    resumo.encontrados = aAvisar.length

    for (const anuncio of aAvisar) {
      // RN-187: marca antes de enviar; se outra rodada marcou primeiro, este anúncio já é dela.
      if (!(await this.guarda.marcarAvisado(anuncio.id, anuncio.expiraEm))) continue

      // RN-122: fica marcado sem envio, para não voltar toda rodada.
      if (!anuncio.dono.ativo || !podeReceberEmail(anuncio.dono.email)) {
        resumo.ignorados++
        continue
      }

      const envio = await this.enviar(anuncio)
      if (envio.ok) {
        resumo.enviados++
        continue
      }
      // RN-187: desfaz a marca para tentar de novo na rodada seguinte.
      await this.guarda.desmarcar(anuncio.id, anuncio.expiraEm)
      resumo.falhas++
      console.error("[aviso de apagar] não enviado", anuncio.codigo, envio.codigo, envio.mensagem)
    }
    return resumo
  }

  private async enviar(anuncio: AnuncioParaAvisarAntesDeApagar): Promise<Result<unknown>> {
    const carta = montarAvisoDeApagar({
      dono: { nome: anuncio.dono.nome },
      anuncio,
      linkParaRenovar: this.enderecos.anuncioEmMinhaConta(anuncio.id),
    })
    try {
      return await this.correio.enviar({ nome: anuncio.dono.nome, email: anuncio.dono.email }, carta)
    } catch (erro) {
      // O correio não deveria lançar (RN-100), mas uma exceção não pode deixar a marca presa.
      return falha("ENVIO_FALHOU", erro instanceof Error ? erro.message : String(erro))
    }
  }
}
