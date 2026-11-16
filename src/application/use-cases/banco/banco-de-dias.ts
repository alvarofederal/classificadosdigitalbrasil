// APLICAÇÃO — banco de dias: usar os dias num anúncio e o presente de boas-vindas (feature 017: RF-172, RF-173; RN-171 a RN-179).

import { podeReceberEmail } from "@/domain/anuncio/vencimento"
import { PRESENTE_DE_BOAS_VINDAS, type TipoDeDia, conferirUsoDoBanco } from "@/domain/banco/banco-de-dias"
import { type Result, falha, falhaDeValidacao, ok } from "@/domain/shared/result"
import type { UsuarioRepository } from "../../ports/acesso"
import type { BancoDeDiasRepository, PresenteDeBoasVindas } from "../../ports/banco"
import type { AnuncioRepository, ConfiguracaoRepository } from "../../ports/caderno"
import type { Relogio } from "../../ports/sistema"
import { type ConfirmarPagamentoUseCase, type DepsDePagamento, publicarSemCobranca } from "../pagamentos/pagamentos"

/** RF-172 e RF-173: publica, renova ou prolonga o anúncio com dias do banco, sem Pix. */
export class UsarDiasDoBancoUseCase {
  constructor(
    private readonly anuncios: AnuncioRepository,
    private readonly banco: BancoDeDiasRepository,
    private readonly deps: DepsDePagamento,
    private readonly confirmar: ConfirmarPagamentoUseCase,
  ) {}

  async executar(entrada: { usuarioId: string; anuncioId: string; tipo: string; dias: number }): Promise<Result<{ expiraEm: Date }>> {
    const anuncio = await this.anuncios.buscarPorId(entrada.anuncioId)
    if (!anuncio || anuncio.usuarioId !== entrada.usuarioId) return falha("NAO_ENCONTRADO", "Anúncio não encontrado.")
    const saldo = await this.banco.saldo(entrada.usuarioId)
    const erros = conferirUsoDoBanco({ tipo: entrada.tipo, dias: entrada.dias }, anuncio, saldo, this.deps.relogio.agora())
    if (Object.keys(erros).length > 0) return falhaDeValidacao(erros)
    const tipo = entrada.tipo as TipoDeDia

    // RN-173: o desconto só acontece se ainda houver saldo na hora (dois pedidos ao mesmo tempo não gastam duas vezes).
    if (!(await this.banco.debitar(entrada.usuarioId, tipo, entrada.dias, { anuncioId: anuncio.id }))) {
      return falhaDeValidacao({ dias: "O saldo do banco mudou. Confira os dias que você tem e tente de novo." })
    }
    const publicado = await publicarSemCobranca(this.deps, this.confirmar, {
      anuncio,
      planoCodigo: tipo,
      dias: entrada.dias,
      origem: "BANCO",
      adminId: null,
      seOPixJaFoiPago: "O Pix deste anúncio já foi pago. A confirmação aparece em instantes, e os dias do banco continuam guardados.",
    })
    if (!publicado.ok) {
      // RN-173: nada foi publicado, então os dias voltam, com o registro da devolução.
      await this.banco.creditar(entrada.usuarioId, tipo, entrada.dias, "DEVOLUCAO", { anuncioId: anuncio.id })
      return publicado
    }
    return ok({ expiraEm: publicado.valor.expiraEm })
  }
}

/** RN-174: 7 dias sem foto e 7 com foto, uma vez por conta, quando o e-mail é confirmado (feature 016). */
export class DarPresenteDeBoasVindasUseCase implements PresenteDeBoasVindas {
  constructor(
    private readonly usuarios: UsuarioRepository,
    private readonly banco: BancoDeDiasRepository,
    private readonly configuracao: ConfiguracaoRepository,
    private readonly relogio: Relogio,
  ) {}

  async dar(usuarioId: string): Promise<boolean> {
    const usuario = await this.usuarios.buscarPorId(usuarioId)
    // Não ganham: administrador, conta desativada e e-mail de teste (RN-122).
    if (!usuario || usuario.perfil !== "ANUNCIANTE" || !usuario.ativo || !podeReceberEmail(usuario.email)) return false
    // RF-174: desligado no Painel, ninguém ganha (nem depois, quando religar).
    if (!(await this.configuracao.presenteLigado())) return false
    return this.banco.darPresente(usuarioId, PRESENTE_DE_BOAS_VINDAS, this.relogio.agora())
  }
}
