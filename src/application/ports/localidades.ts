// APLICAÇÃO — catálogo de municípios do IBGE (ADR-06).

import type { Cidade, UF } from "@/domain/localidade/uf"

export interface Localidades {
  cidade(codigo: number): Cidade | null
  cidadePorSlug(uf: UF, slug: string): Cidade | null
  cidadesDaUf(uf: UF): Cidade[]
}
