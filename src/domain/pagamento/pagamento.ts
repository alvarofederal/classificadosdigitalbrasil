// DOMÍNIO — pagamento do espaço: R$ 1,00 por 7 dias, por padrão (RN-20 a RN-24).

import type { ErrosDeCampo } from "../shared/result"

export const SITUACOES_DO_PAGAMENTO = {
  PENDENTE: "Aguardando",
  CONFIRMADO: "Confirmado",
  CANCELADO: "Cancelado",
} as const

export type SituacaoDoPagamento = keyof typeof SITUACOES_DO_PAGAMENTO

export const VALOR_PADRAO_CENTAVOS = 100
export const DIAS_PADRAO = 7

export interface TabelaDePreco {
  valorAnuncioCentavos: number
  diasDePublicacao: number
}

export function validarTabelaDePreco(tabela: TabelaDePreco, erros: ErrosDeCampo = {}): ErrosDeCampo {
  if (!Number.isSafeInteger(tabela.valorAnuncioCentavos) || tabela.valorAnuncioCentavos < 1 || tabela.valorAnuncioCentavos > 100_000) {
    erros.valorAnuncio = "Valor entre R$ 0,01 e R$ 1.000,00."
  }
  if (!Number.isInteger(tabela.diasDePublicacao) || tabela.diasDePublicacao < 1 || tabela.diasDePublicacao > 90) {
    erros.diasDePublicacao = "Entre 1 e 90 dias."
  }
  return erros
}

/** Código do pagamento: vai no campo de identificação do Pix e aparece no extrato do recebedor. */
export const ALFABETO_DO_PAGAMENTO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
export const TAMANHO_DO_CODIGO_DE_PAGAMENTO = 10
