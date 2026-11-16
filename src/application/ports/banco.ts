// APLICAÇÃO — porta do banco de dias (feature 017, ADR-21). Saldo e extrato andam juntos, na mesma transação.

import type { MotivoDoMovimento, SaldoDoBanco, TipoDeDia } from "@/domain/banco/banco-de-dias"

export interface ReferenciasDoMovimento {
  anuncioId?: string | null
  pagamentoId?: string | null
}

export interface BancoDeDiasRepository {
  saldo(usuarioId: string): Promise<SaldoDoBanco>
  /** Soma dias ao saldo e grava a entrada no extrato. */
  creditar(usuarioId: string, tipo: TipoDeDia, dias: number, motivo: MotivoDoMovimento, referencias?: ReferenciasDoMovimento): Promise<void>
  /** RN-173: tira dias só se houver saldo (atualização condicionada) e grava a saída. Falso = saldo insuficiente. */
  debitar(usuarioId: string, tipo: TipoDeDia, dias: number, referencias?: ReferenciasDoMovimento): Promise<boolean>
  /** RN-174: dá o presente só se a conta ainda não recebeu (atualização condicionada). Falso = já tinha recebido. */
  darPresente(usuarioId: string, presente: SaldoDoBanco, quando: Date): Promise<boolean>
}

/** O que a confirmação do e-mail (feature 016) chama para dar o presente de boas-vindas. */
export interface PresenteDeBoasVindas {
  /** Verdadeiro se deu agora; falso se a conta não tem direito ou já tinha recebido. */
  dar(usuarioId: string): Promise<boolean>
}
