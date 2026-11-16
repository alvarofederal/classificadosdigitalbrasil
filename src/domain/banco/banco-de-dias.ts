// DOMÍNIO — banco de dias do anunciante (feature 017: RN-170 a RN-181).
// O banco guarda dias, não anúncios: com 14 dias dá para pôr dois anúncios de 7 dias ou um de 14.

import type { ErrosDeCampo } from "../shared/result"

/** RN-170: os dois tipos de dia são os planos à venda; o código é o do plano que o dia publica. */
export const TIPOS_DE_DIA = ["SIMPLES", "FOTOS"] as const
export type TipoDeDia = (typeof TIPOS_DE_DIA)[number]

export const NOMES_DOS_TIPOS_DE_DIA: Record<TipoDeDia, { singular: string; plural: string }> = {
  SIMPLES: { singular: "dia sem foto", plural: "dias sem foto" },
  FOTOS: { singular: "dia com foto", plural: "dias com foto" },
}

export type SaldoDoBanco = Record<TipoDeDia, number>

export const SALDO_VAZIO: SaldoDoBanco = { SIMPLES: 0, FOTOS: 0 }

/** RN-174: o presente de boas-vindas, por tipo de dia. */
export const PRESENTE_DE_BOAS_VINDAS: SaldoDoBanco = { SIMPLES: 7, FOTOS: 7 }

/** RN-172: publicar ou renovar vencido pede pelo menos uma semana. */
export const MINIMO_PARA_PUBLICAR = 7

/** RN-178: por que os dias entraram ou saíram. Convite, compra e cortesia chegam nas próximas entregas. */
export const MOTIVOS_DO_MOVIMENTO = {
  BOAS_VINDAS: "Presente de boas-vindas",
  USO: "Usado no anúncio",
  DEVOLUCAO: "Devolvido ao banco",
  CONVITE: "Prêmio de convite",
  COMPRA: "Compra pelo Pix",
  CORTESIA: "Cortesia do administrador",
} as const
export type MotivoDoMovimento = keyof typeof MOTIVOS_DO_MOVIMENTO

export function ehTipoDeDia(valor: string): valor is TipoDeDia {
  return (TIPOS_DE_DIA as readonly string[]).includes(valor)
}

export function totalDeDias(saldo: SaldoDoBanco): number {
  return saldo.SIMPLES + saldo.FOTOS
}

/** "7 dias com foto", "1 dia sem foto". */
export function diasPorExtenso(dias: number, tipo: TipoDeDia): string {
  const nome = NOMES_DOS_TIPOS_DE_DIA[tipo]
  return `${dias} ${Math.abs(dias) === 1 ? nome.singular : nome.plural}`
}

/** A situação do anúncio que importa para o banco: ainda em prazo (no ar ou desativado) ou não. */
export interface AnuncioParaOBanco {
  situacao: "AGUARDANDO_PAGAMENTO" | "PUBLICADO" | "DESATIVADO" | "REMOVIDO"
  planoCodigo: string
  expiraEm: Date | null
}

export function emPrazo(anuncio: AnuncioParaOBanco, agora: Date): boolean {
  return (anuncio.situacao === "PUBLICADO" || anuncio.situacao === "DESATIVADO") && anuncio.expiraEm !== null && anuncio.expiraEm.getTime() > agora.getTime()
}

/** RN-172: quantos dias, no mínimo, este uso pede. */
export function minimoDeDias(anuncio: AnuncioParaOBanco, agora: Date): number {
  return emPrazo(anuncio, agora) ? 1 : MINIMO_PARA_PUBLICAR
}

/**
 * RN-171 a RN-173: confere um pedido de uso de dias do banco. Devolve os erros por campo (`planoCodigo`, `dias`);
 * vazio = pode usar.
 */
export function conferirUsoDoBanco(pedido: { tipo: string; dias: number }, anuncio: AnuncioParaOBanco, saldo: SaldoDoBanco, agora: Date): ErrosDeCampo {
  const erros: ErrosDeCampo = {}
  if (anuncio.situacao === "REMOVIDO") return { planoCodigo: "Este anúncio foi removido." }
  if (!ehTipoDeDia(pedido.tipo)) return { planoCodigo: "Escolha dias sem foto ou com foto." }
  // RN-171: o anúncio Com foto em prazo não perde as fotos no meio do caminho.
  if (emPrazo(anuncio, agora) && anuncio.planoCodigo === "FOTOS" && pedido.tipo === "SIMPLES") {
    return { planoCodigo: "Este anúncio está no plano Com foto: use dias com foto." }
  }
  const minimo = minimoDeDias(anuncio, agora)
  if (!Number.isInteger(pedido.dias) || pedido.dias < minimo) {
    erros.dias = minimo === 1 ? "Use pelo menos 1 dia." : `Para pôr o anúncio no caderno, use pelo menos ${MINIMO_PARA_PUBLICAR} dias.`
  } else if (pedido.dias > saldo[pedido.tipo]) {
    erros.dias = saldo[pedido.tipo] === 0 ? `Você não tem ${NOMES_DOS_TIPOS_DE_DIA[pedido.tipo].plural} no banco.` : `Você tem ${diasPorExtenso(saldo[pedido.tipo], pedido.tipo)} no banco.`
  }
  return erros
}

/** RN-180: o dia custa o mesmo em todo período, proporcional ao preço de 7 dias, arredondado ao centavo. */
export function precoProporcional(precoDe7DiasCentavos: number, dias: number): number {
  return Math.round((precoDe7DiasCentavos * dias) / 7)
}
