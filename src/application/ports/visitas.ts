// APLICAÇÃO — portas das visitas do anúncio (feature 013, ADR-18).

import type { Dia, LocalDaVisita, VisitasDoDia } from "@/domain/anuncio/visitas"

/** NOVA = primeira visita da pessoa no dia; REPETIDA = mais uma no mesmo dia; NO_LIMITE = não somou (RN-134). */
export type RegistroDaVisita = "NOVA" | "REPETIDA" | "NO_LIMITE"

export interface VisitaDaPessoa {
  anuncioId: string
  dia: Dia
  /** RN-131: a pessoa já anônima; o IP não passa desta porta. */
  chave: string
  local: LocalDaVisita
}

export interface VisitasRepository {
  /** Soma uma visita da pessoa no dia, até `limitePorDia` (RN-134). */
  registrar(visita: VisitaDaPessoa, limitePorDia: number): Promise<RegistroDaVisita>
}

export interface AnonimizadorDeVisitante {
  /** Falso sem o segredo: só o total de visitas é somado (RN-135). */
  readonly ligado: boolean
  /** RN-131: chave irreversível da pessoa neste anúncio; null sem o segredo. */
  chave(anuncioId: string, ipNormalizado: string, navegador: string): string | null
}

/** Leitura para as telas de Minha conta e do Painel (RF-131 a RF-133). */
export interface VisitasQuery {
  /** Visitas e pessoas por dia, de `desde` até hoje, de cada anúncio. Só vêm os dias com visita. */
  porDia(anuncioIds: string[], desde: Dia): Promise<Map<string, VisitasDoDia[]>>
  /** Pessoas diferentes de cada anúncio, desde o começo da contagem por pessoa. */
  pessoas(anuncioIds: string[]): Promise<Map<string, number>>
  /** Pessoas por cidade de um anúncio. */
  cidades(anuncioId: string): Promise<Array<LocalDaVisita & { pessoas: number }>>
}
