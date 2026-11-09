// DOMÍNIO — planos do anúncio e tabela de preços (feature 003: RF-50 a RF-53, RN-50 a RN-55).

import type { ErrosDeCampo } from "../shared/result"
import { validarTamanho } from "../shared/texto"

/** Códigos fixos (RN-55). A ordem aqui é a ordem de exibição. */
export const CODIGOS_DE_PLANO = ["SIMPLES", "FOTOS", "DESTAQUE", "VITRINE"] as const
export type CodigoDoPlano = (typeof CODIGOS_DE_PLANO)[number]

export const PERIODOS = [7, 30] as const
export type Periodo = (typeof PERIODOS)[number]

/** O que cada código garante, independentemente do que o admin editar (RN-50, RN-52). */
export const RECURSOS_DO_PLANO: Record<CodigoDoPlano, { prioridade: number; destaque: boolean; vitrine: boolean }> = {
  SIMPLES: { prioridade: 0, destaque: false, vitrine: false },
  FOTOS: { prioridade: 1, destaque: false, vitrine: false },
  DESTAQUE: { prioridade: 2, destaque: true, vitrine: false },
  VITRINE: { prioridade: 3, destaque: true, vitrine: true },
}

export interface Plano {
  codigo: CodigoDoPlano
  nome: string
  descricao: string
  maxFotos: number
  valor7DiasCentavos: number
  valor30DiasCentavos: number
  ativo: boolean
}

/** Tabela inicial proposta (mês = 3 semanas). O admin muda tudo menos o código. */
export const PLANOS_INICIAIS: Plano[] = [
  {
    codigo: "SIMPLES",
    nome: "Simples",
    descricao: "Texto com formatação, mensagem, página própria e 1 foto.",
    maxFotos: 1,
    valor7DiasCentavos: 100,
    valor30DiasCentavos: 300,
    ativo: true,
  },
  {
    codigo: "FOTOS",
    nome: "Com fotos",
    descricao: "Tudo do Simples, com álbum de até 6 fotos.",
    maxFotos: 6,
    valor7DiasCentavos: 300,
    valor30DiasCentavos: 900,
    ativo: true,
  },
  {
    codigo: "DESTAQUE",
    nome: "Destaque",
    descricao: "6 fotos, moldura de destaque e lugar antes dos planos menores na seção.",
    maxFotos: 6,
    valor7DiasCentavos: 500,
    valor30DiasCentavos: 1500,
    ativo: true,
  },
  {
    codigo: "VITRINE",
    nome: "Vitrine",
    descricao: "Tudo do Destaque, no topo da seção e na vitrine da capa.",
    maxFotos: 6,
    valor7DiasCentavos: 1000,
    valor30DiasCentavos: 3000,
    ativo: true,
  },
]

export function ehCodigoDePlano(valor: string): valor is CodigoDoPlano {
  return (CODIGOS_DE_PLANO as readonly string[]).includes(valor)
}

export function ehPeriodo(valor: number): valor is Periodo {
  return (PERIODOS as readonly number[]).includes(valor)
}

export function valorDoPeriodo(plano: Pick<Plano, "valor7DiasCentavos" | "valor30DiasCentavos">, dias: Periodo): number {
  return dias === 30 ? plano.valor30DiasCentavos : plano.valor7DiasCentavos
}

export function prioridadeDoPlano(codigo: string): number {
  return ehCodigoDePlano(codigo) ? RECURSOS_DO_PLANO[codigo].prioridade : 0
}

export function planoTemDestaque(codigo: string): boolean {
  return ehCodigoDePlano(codigo) && RECURSOS_DO_PLANO[codigo].destaque
}

/** Edição do admin em Painel → Planos (RF-51). */
export function validarPlano(plano: Omit<Plano, "codigo">): ErrosDeCampo {
  const erros: ErrosDeCampo = {}
  validarTamanho(plano.nome.trim(), "nome", "o nome", { min: 2, max: 40 }, erros)
  validarTamanho(plano.descricao.trim(), "descricao", "a descrição", { min: 5, max: 200 }, erros)
  if (!Number.isInteger(plano.maxFotos) || plano.maxFotos < 0 || plano.maxFotos > 6) erros.maxFotos = "Entre 0 e 6 fotos."
  for (const [campo, valor] of [
    ["valor7Dias", plano.valor7DiasCentavos],
    ["valor30Dias", plano.valor30DiasCentavos],
  ] as const) {
    if (!Number.isSafeInteger(valor) || valor < 1 || valor > 1_000_000) erros[campo] = "Valor entre R$ 0,01 e R$ 10.000,00."
  }
  return erros
}
