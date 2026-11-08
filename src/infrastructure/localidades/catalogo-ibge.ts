// INFRAESTRUTURA — catálogo de municípios do IBGE, lido do JSON gerado por scripts/gerar-municipios.mjs (ADR-06).

import type { Localidades } from "@/application/ports/localidades"
import { type Cidade, type UF, ufDe } from "@/domain/localidade/uf"
import municipios from "./municipios.json"

type Linha = [number, string, string]

export class CatalogoIbge implements Localidades {
  private readonly porCodigo = new Map<number, Cidade>()
  private readonly porUf = new Map<UF, Cidade[]>()
  private readonly porSlug = new Map<string, Cidade>()

  constructor(dados: Record<string, Linha[]> = municipios as unknown as Record<string, Linha[]>) {
    for (const [sigla, linhas] of Object.entries(dados)) {
      const uf = ufDe(sigla)
      if (!uf) continue
      const cidades = linhas.map(([codigo, nome, slug]) => ({ codigo, nome, slug, uf }))
      this.porUf.set(uf, cidades)
      for (const cidade of cidades) {
        this.porCodigo.set(cidade.codigo, cidade)
        this.porSlug.set(`${uf}/${cidade.slug}`, cidade)
      }
    }
  }

  cidade(codigo: number): Cidade | null {
    return this.porCodigo.get(codigo) ?? null
  }

  cidadePorSlug(uf: UF, slug: string): Cidade | null {
    return this.porSlug.get(`${uf}/${slug}`) ?? null
  }

  cidadesDaUf(uf: UF): Cidade[] {
    return this.porUf.get(uf) ?? []
  }
}
