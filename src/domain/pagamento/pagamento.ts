// DOMÍNIO — cobrança do espaço (RN-20 a RN-24; planos na feature 003; gateway na feature 006).

export const SITUACOES_DO_PAGAMENTO = {
  PENDENTE: "Aguardando",
  CONFIRMADO: "Confirmado",
  CANCELADO: "Cancelado",
} as const

export type SituacaoDoPagamento = keyof typeof SITUACOES_DO_PAGAMENTO

/** De onde veio o pagamento: Pix estático (null), gateway automático ou cortesia do admin (RF-84). */
export type OrigemDoPagamento = "MERCADO_PAGO" | "CORTESIA" | null

export const ORIGENS_DO_PAGAMENTO: Record<string, string> = {
  MERCADO_PAGO: "Pix automático",
  CORTESIA: "Cortesia",
}

/** Código da cobrança: vai no Pix como referência e aparece no extrato do recebedor. */
export const ALFABETO_DO_PAGAMENTO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
export const TAMANHO_DO_CODIGO_DE_PAGAMENTO = 10

/** RN-83: o Pix dinâmico vence em 24 horas. */
export const VALIDADE_DO_PIX_MS = 24 * 60 * 60 * 1000
