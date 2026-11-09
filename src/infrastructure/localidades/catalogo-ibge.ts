// INFRAESTRUTURA — catálogo de municípios do IBGE com coordenadas, lido do JSON gerado por scripts/gerar-municipios.mjs (ADR-06, feature 002).

import type { Localidades } from "@/application/ports/localidades"
import { type Coordenada, distanciaKm } from "@/domain/localidade/geo"
import { type Cidade, type UF, ufDe } from "@/domain/localidade/uf"
import municipios from "./municipios.json"

type Linha = [number, string, string, number | null, number | null]

export class CatalogoIbge implements Localidades {
  private readonly porCodigo = new Map<number, Cidade>()
  private readonly porUf = new Map<UF, Cidade[]>()
  private readonly porSlug = new Map<string, Cidade>()
  private readonly comCoordenada: Array<{ cidade: Cidade; latitude: number; longitude: number }> = []

  constructor(dados: Record<string, Linha[]> = municipios as unknown as Record<string, Linha[]>) {
    for (const [sigla, linhas] of Object.entries(dados)) {
      const uf = ufDe(sigla)
      if (!uf) continue
      const cidades: Cidade[] = []
      for (const [codigo, nome, slug, latitude, longitude] of linhas) {
        const cidade = { codigo, nome, slug, uf }
        cidades.push(cidade)
        this.porCodigo.set(codigo, cidade)
        this.porSlug.set(`${uf}/${slug}`, cidade)
        if (latitude !== null && longitude !== null) this.comCoordenada.push({ cidade, latitude, longitude })
      }
      this.porUf.set(uf, cidades)
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

  /** Varre as 5.571 sedes: menos de 1 ms, sem serviço externo (RN-40). */
  cidadeMaisProxima(coordenada: Coordenada): Cidade | null {
    let melhor: Cidade | null = null
    let menor = Number.POSITIVE_INFINITY
    for (const item of this.comCoordenada) {
      const d = distanciaKm(coordenada, item)
      if (d < menor) {
        menor = d
        melhor = item.cidade
      }
    }
    return melhor
  }
}
