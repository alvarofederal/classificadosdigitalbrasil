// APLICAÇÃO — ações públicas da capa: contato com o admin e "anúncios perto de mim" (RF-41, RF-60 a RF-62; RN-40, RN-41, RN-60, RN-61).

import {
  ALFABETO_DO_PROTOCOLO,
  LIMITES_DO_CHAMADO,
  type NovoChamado,
  TAMANHO_DO_PROTOCOLO,
  normalizarChamado,
  validarChamado,
} from "@/domain/chamado/chamado"
import type { Assunto } from "@/domain/chamado/chamado"
import { type Coordenada, dentroDoBrasil } from "@/domain/localidade/geo"
import type { Cidade } from "@/domain/localidade/uf"
import { type Result, falha, falhaDeValidacao, ok } from "@/domain/shared/result"
import type { ChamadoRepository } from "../../ports/caderno"
import type { Localidades } from "../../ports/localidades"
import type { GeradorDeCodigo, Relogio } from "../../ports/sistema"

export class AbrirChamadoUseCase {
  constructor(
    private readonly chamados: ChamadoRepository,
    private readonly codigos: GeradorDeCodigo,
    private readonly relogio: Relogio,
  ) {}

  async executar(entrada: NovoChamado): Promise<Result<{ protocolo: string }>> {
    const chamado = normalizarChamado(entrada)
    const erros = validarChamado(chamado)
    if (Object.keys(erros).length > 0) return falhaDeValidacao(erros)

    const agora = this.relogio.agora()
    const recentes = await this.chamados.contarDoEmailDesde(chamado.email, new Date(agora.getTime() - 3_600_000))
    if (recentes >= LIMITES_DO_CHAMADO.porEmailPorHora) {
      return falha("MUITOS_CHAMADOS", "Recebemos várias mensagens deste e-mail na última hora. Aguarde a resposta.")
    }

    let protocolo = this.codigos.codigo(ALFABETO_DO_PROTOCOLO, TAMANHO_DO_PROTOCOLO)
    while (await this.chamados.existeProtocolo(protocolo)) protocolo = this.codigos.codigo(ALFABETO_DO_PROTOCOLO, TAMANHO_DO_PROTOCOLO)
    await this.chamados.inserir({
      protocolo,
      nome: chamado.nome,
      email: chamado.email,
      telefone: chamado.telefone,
      assunto: chamado.assunto as Assunto,
      mensagem: chamado.mensagem,
      anuncioCodigo: chamado.anuncioCodigo,
      situacao: "ABERTO",
      notaInterna: null,
      criadoEm: agora,
      resolvidoEm: null,
    })
    return ok({ protocolo })
  }
}

/** RN-40: a coordenada só serve para achar a cidade; não é gravada nem repassada. */
export class LocalizarCidadeUseCase {
  constructor(private readonly localidades: Localidades) {}

  executar(coordenada: Coordenada): Result<Cidade> {
    if (!dentroDoBrasil(coordenada)) return falha("FORA_DO_BRASIL", "Não encontramos sua cidade. Escolha o estado e a cidade na busca.")
    const cidade = this.localidades.cidadeMaisProxima(coordenada)
    return cidade ? ok(cidade) : falha("SEM_CIDADE", "Não encontramos sua cidade. Escolha o estado e a cidade na busca.")
  }
}
