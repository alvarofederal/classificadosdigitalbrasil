// APLICAÇÃO — catálogo de municípios do IBGE (ADR-06) com coordenadas (feature 002).

import type { Coordenada } from "@/domain/localidade/geo"
import type { Cidade, UF } from "@/domain/localidade/uf"

export interface Localidades {
  cidade(codigo: number): Cidade | null
  cidadePorSlug(uf: UF, slug: string): Cidade | null
  cidadesDaUf(uf: UF): Cidade[]
  /** Município cuja sede está mais perto da coordenada (RF-41). */
  cidadeMaisProxima(coordenada: Coordenada): Cidade | null
}
