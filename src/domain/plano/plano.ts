// DOMÍNIO — planos do anúncio e tabela de preços por período (features 003 e 009: RF-50 a RF-53, RN-50 a RN-57).

import type { ErrosDeCampo } from "../shared/result"
import { validarTamanho } from "../shared/texto"

/** Códigos fixos (RN-55). A ordem aqui é a ordem de exibição. */
export const CODIGOS_DE_PLANO = ["SIMPLES", "FOTOS", "DESTAQUE", "VITRINE"] as const
export type CodigoDoPlano = (typeof CODIGOS_DE_PLANO)[number]

/** RN-56: períodos à venda, a partir de 7 dias. */
export const PERIODOS = [7, 10, 15, 20, 30] as const
export type Periodo = (typeof PERIODOS)[number]

/** O que cada código garante, independentemente do que o admin editar (RN-50, RN-52). */
export const RECURSOS_DO_PLANO: Record<CodigoDoPlano, { prioridade: number; destaque: boolean; vitrine: boolean }> = {
  SIMPLES: { prioridade: 0, destaque: false, vitrine: false },
  FOTOS: { prioridade: 1, destaque: false, vitrine: false },
  DESTAQUE: { prioridade: 2, destaque: true, vitrine: false },
  VITRINE: { prioridade: 3, destaque: true, vitrine: true },
}

/** Preço em centavos por período; período ausente não é vendido nesse plano. */
export type Precos = Partial<Record<Periodo, number>>

export interface Plano {
  codigo: CodigoDoPlano
  nome: string
  descricao: string
  maxFotos: number
  precos: Precos
  ativo: boolean
}

/** Tabela decidida pelo Álvaro em 2026-11-09 (spec 009). O admin muda tudo menos o código. */
export const PLANOS_INICIAIS: Plano[] = [
  {
    codigo: "SIMPLES",
    nome: "Simples",
    descricao: "Texto com formatação, página própria e chat com os interessados.",
    maxFotos: 0,
    precos: { 7: 100, 10: 400, 15: 950, 20: 1450, 30: 2500 },
    ativo: true,
  },
  {
    codigo: "FOTOS",
    nome: "Com foto",
    descricao: "Tudo do Simples, com álbum de até 6 fotos.",
    maxFotos: 6,
    precos: { 7: 1000, 10: 4000, 15: 9500, 20: 14500, 30: 25000 },
    ativo: true,
  },
  {
    codigo: "DESTAQUE",
    nome: "Destaque",
    descricao: "Fotos, moldura de destaque e lugar antes dos planos menores na seção.",
    maxFotos: 6,
    precos: { 7: 500, 30: 1500 },
    ativo: false,
  },
  {
    codigo: "VITRINE",
    nome: "Vitrine",
    descricao: "Tudo do Destaque, no topo da seção.",
    maxFotos: 6,
    precos: { 7: 1000, 30: 3000 },
    ativo: false,
  },
]

export function ehCodigoDePlano(valor: string): valor is CodigoDoPlano {
  return (CODIGOS_DE_PLANO as readonly string[]).includes(valor)
}

export function ehPeriodo(valor: number): valor is Periodo {
  return (PERIODOS as readonly number[]).includes(valor)
}

/** Períodos com preço neste plano, em ordem. */
export function periodosDoPlano(plano: Pick<Plano, "precos">): Periodo[] {
  return PERIODOS.filter((dias) => (plano.precos[dias] ?? 0) > 0)
}

/** Preço do período em centavos, ou null se o plano não vende esse período. */
export function valorDoPeriodo(plano: Pick<Plano, "precos">, dias: number): number | null {
  if (!ehPeriodo(dias)) return null
  const valor = plano.precos[dias]
  return valor && valor > 0 ? valor : null
}

/** O preço de entrada da tabela: o menor valor à venda, com o período dele. */
export function menorPreco(planos: Array<Pick<Plano, "precos">>): { valorCentavos: number; dias: Periodo } | null {
  let menor: { valorCentavos: number; dias: Periodo } | null = null
  for (const plano of planos) {
    for (const dias of periodosDoPlano(plano)) {
      const valor = plano.precos[dias]!
      if (!menor || valor < menor.valorCentavos || (valor === menor.valorCentavos && dias > menor.dias)) menor = { valorCentavos: valor, dias }
    }
  }
  return menor
}

export function prioridadeDoPlano(codigo: string): number {
  return ehCodigoDePlano(codigo) ? RECURSOS_DO_PLANO[codigo].prioridade : 0
}

export function planoTemDestaque(codigo: string): boolean {
  return ehCodigoDePlano(codigo) && RECURSOS_DO_PLANO[codigo].destaque
}

/** Edição do admin em Painel → Planos (RF-51, RN-56). Campo de preço: `preco7`, `preco10`… */
export function validarPlano(plano: Omit<Plano, "codigo">): ErrosDeCampo {
  const erros: ErrosDeCampo = {}
  validarTamanho(plano.nome.trim(), "nome", "o nome", { min: 2, max: 40 }, erros)
  validarTamanho(plano.descricao.trim(), "descricao", "a descrição", { min: 5, max: 200 }, erros)
  if (!Number.isInteger(plano.maxFotos) || plano.maxFotos < 0 || plano.maxFotos > 6) erros.maxFotos = "Entre 0 e 6 fotos."
  for (const dias of PERIODOS) {
    const valor = plano.precos[dias]
    if (valor === undefined) continue
    if (!Number.isSafeInteger(valor) || valor < 1 || valor > 1_000_000) erros[`preco${dias}`] = "Valor entre R$ 0,01 e R$ 10.000,00."
  }
  if (periodosDoPlano(plano).length === 0 && !erros.preco7) erros.preco7 = "Informe o preço de pelo menos um período."
  return erros
}
