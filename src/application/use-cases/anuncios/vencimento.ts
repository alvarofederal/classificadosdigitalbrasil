// APLICAÇÃO — rodada diária do aviso de vencimento (feature 012: RF-120 a RF-122, RN-120 a RN-125; ADR-17).

import { AVISOS_DE_VENCIMENTO_POR_RODADA, JANELA_DO_AVISO_DE_VENCIMENTO_MS, montarAvisoDeVencimento, podeReceberEmail } from "@/domain/anuncio/vencimento"
import { type Result, falha } from "@/domain/shared/result"
import type { AnuncioAVencer, AvisosDeVencimentoRepository } from "../../ports/caderno"
import type { Correio, EnderecosDoSite } from "../../ports/correio"
import type { Relogio } from "../../ports/sistema"

export interface ResumoDosAvisosDeVencimento {
  /** Falso quando falta o servidor de e-mail (RF-122). */
  ligado: boolean
  encontrados: number
  enviados: number
  /** Conta desativada ou endereço de teste (RN-122). */
  ignorados: number
  falhas: number
}

export class AvisarVencimentosUseCase {
  constructor(
    private readonly avisos: AvisosDeVencimentoRepository,
    private readonly correio: Correio,
    private readonly relogio: Relogio,
    private readonly enderecos: EnderecosDoSite,
  ) {}

  async executar(): Promise<ResumoDosAvisosDeVencimento> {
    const resumo: ResumoDosAvisosDeVencimento = { ligado: this.correio.ligado, encontrados: 0, enviados: 0, ignorados: 0, falhas: 0 }
    // RF-122: sem servidor de e-mail, nada é enviado nem marcado.
    if (!this.correio.ligado) return resumo

    const agora = this.relogio.agora()
    const ate = new Date(agora.getTime() + JANELA_DO_AVISO_DE_VENCIMENTO_MS)
    const aVencer = await this.avisos.aVencer(agora, ate, AVISOS_DE_VENCIMENTO_POR_RODADA)
    resumo.encontrados = aVencer.length

    // Um de cada vez, para não estourar o limite de envio do provedor.
    for (const anuncio of aVencer) {
      // RN-120: marca antes de enviar; se outra rodada marcou primeiro, este anúncio já é dela.
      if (!(await this.avisos.marcarAvisado(anuncio.id, anuncio.expiraEm))) continue

      // RN-122: fica marcado sem envio, para não voltar toda rodada.
      if (!anuncio.dono.ativo || !podeReceberEmail(anuncio.dono.email)) {
        resumo.ignorados++
        continue
      }

      const envio = await this.enviar(anuncio, agora)
      if (envio.ok) {
        resumo.enviados++
        continue
      }
      // RN-121: desfaz a marca para tentar de novo na rodada seguinte. No log, só o código do anúncio.
      await this.avisos.desmarcar(anuncio.id, anuncio.expiraEm)
      resumo.falhas++
      console.error("[aviso de vencimento] não enviado", anuncio.codigo, envio.codigo, envio.mensagem)
    }
    return resumo
  }

  private async enviar(anuncio: AnuncioAVencer, agora: Date): Promise<Result<unknown>> {
    // RN-125: do cadastro, só o nome vai para a carta; o e-mail é apenas o destino.
    const carta = montarAvisoDeVencimento({
      dono: { nome: anuncio.dono.nome },
      anuncio,
      agora,
      linkParaRenovar: this.enderecos.anuncioEmMinhaConta(anuncio.id),
      linkDoAnuncio: this.enderecos.paginaDoAnuncio(anuncio.codigo),
    })
    try {
      return await this.correio.enviar({ nome: anuncio.dono.nome, email: anuncio.dono.email }, carta)
    } catch (erro) {
      // O correio não deveria lançar (RN-100), mas uma exceção não pode deixar a marca presa.
      return falha("ENVIO_FALHOU", erro instanceof Error ? erro.message : String(erro))
    }
  }
}
