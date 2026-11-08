// APRESENTAÇÃO — formatação pt-BR. Regras não moram aqui; só a cara dos números e das datas.

import { formatarReais } from "@/domain/shared/dinheiro"

export { formatarReais }
export { formatarCelular } from "@/domain/usuario/usuario"

const FUSO = "America/Sao_Paulo"
const NUMERO = new Intl.NumberFormat("pt-BR")
const DIA = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: FUSO })
const DIA_CURTO = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: FUSO })
const DATA_HORA = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: FUSO })
const DATA_POR_EXTENSO = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: FUSO })

export function formatarDia(instante: Date | null): string {
  return instante ? DIA.format(instante) : "—"
}

export function formatarDiaCurto(instante: Date | null): string {
  return instante ? DIA_CURTO.format(instante) : "—"
}

export function formatarDataHora(instante: Date | null): string {
  return instante ? DATA_HORA.format(instante) : "—"
}

/** "sábado, 8 de novembro de 2026" — a linha de data do cabeçalho do jornal. */
export function dataPorExtenso(instante: Date): string {
  return DATA_POR_EXTENSO.format(instante)
}

export function plural(n: number, singular: string, pluralTexto: string): string {
  return `${NUMERO.format(n)} ${n === 1 ? singular : pluralTexto}`
}

/** Valor em centavos para preencher um campo de texto em reais ("22.000,00"). */
export function reaisParaCampo(valor: number | null): string {
  if (valor === null) return ""
  return formatarReais(valor).replace(/^R\$\s/, "")
}

/** Dias inteiros que faltam (arredonda para cima). */
export function diasRestantes(expiraEm: Date | null, agora: Date): number {
  if (!expiraEm) return 0
  return Math.max(0, Math.ceil((expiraEm.getTime() - agora.getTime()) / 86_400_000))
}
