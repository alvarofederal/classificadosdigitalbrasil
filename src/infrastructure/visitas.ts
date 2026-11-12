// INFRAESTRUTURA — a pessoa como chave HMAC e as visitas no MySQL (feature 013, ADR-18).

import { createHmac } from "crypto"
import type { AnonimizadorDeVisitante, RegistroDaVisita, VisitaDaPessoa, VisitasQuery, VisitasRepository } from "@/application/ports/visitas"
import type { Dia, LocalDaVisita, VisitasDoDia } from "@/domain/anuncio/visitas"
import type { PrismaClient } from "@/generated/prisma"

export const TAMANHO_MINIMO_DO_SEGREDO_DE_VISITAS = 32
/** Versão no texto assinado: se a regra da pessoa mudar, as chaves novas não se confundem com as antigas. */
const PREFIXO = "visita:v1:"

/** RN-131: HMAC-SHA-256 com segredo. Sem ele não se volta ao IP nem se testa um IP contra a tabela. */
export class HmacAnonimizadorDeVisitante implements AnonimizadorDeVisitante {
  private readonly segredo: string | null

  constructor(segredo: string | undefined) {
    const limpo = segredo?.trim() ?? ""
    this.segredo = limpo.length >= TAMANHO_MINIMO_DO_SEGREDO_DE_VISITAS ? limpo : null
  }

  get ligado(): boolean {
    return this.segredo !== null
  }

  chave(anuncioId: string, ipNormalizado: string, navegador: string): string | null {
    if (!this.segredo) return null
    // O separador não aparece em id, IP nem navegador comum; o navegador vai por último e inteiro.
    return createHmac("sha256", this.segredo).update(`${PREFIXO}${anuncioId}\n${ipNormalizado}\n${navegador}`).digest("hex")
  }
}

/** DATE do MySQL ↔ dia AAAA-MM-DD, sem fuso no caminho. */
const paraData = (dia: Dia) => new Date(`${dia}T00:00:00Z`)
const paraDia = (data: Date): Dia => data.toISOString().slice(0, 10)

export class PrismaVisitasRepository implements VisitasRepository {
  constructor(private readonly db: PrismaClient) {}

  /**
   * RN-134. Primeiro tenta somar na linha do dia, abaixo do limite; se nada mudou, cria a linha. O número de linhas
   * alteradas decide, e ele não depende de como o MySQL conta linhas iguais: o UPDATE só casa linha que muda, e o
   * INSERT IGNORE só conta a linha criada. Nenhum dos dois: a pessoa já está no limite do dia.
   */
  async registrar(visita: VisitaDaPessoa, limitePorDia: number): Promise<RegistroDaVisita> {
    const { anuncioId, dia, chave, local } = visita
    const somou = await this.db.$executeRaw`
      UPDATE visitas_anuncio SET vezes = vezes + 1
      WHERE anuncioId = ${anuncioId} AND dia = ${dia} AND chave = ${chave} AND vezes < ${limitePorDia}`
    if (somou > 0) return "REPETIDA"
    const criou = await this.db.$executeRaw`
      INSERT IGNORE INTO visitas_anuncio (anuncioId, dia, chave, vezes, cidade, uf, pais)
      VALUES (${anuncioId}, ${dia}, ${chave}, 1, ${local.cidade}, ${local.uf}, ${local.pais})`
    return criou > 0 ? "NOVA" : "NO_LIMITE"
  }
}

export class PrismaVisitasQuery implements VisitasQuery {
  constructor(private readonly db: PrismaClient) {}

  async porDia(anuncioIds: string[], desde: Dia) {
    const linhas = await this.db.visitaAnuncio.groupBy({
      by: ["anuncioId", "dia"],
      where: { anuncioId: { in: anuncioIds }, dia: { gte: paraData(desde) } },
      _count: { _all: true },
      _sum: { vezes: true },
    })
    const resultado = new Map<string, VisitasDoDia[]>()
    for (const l of linhas) {
      const dias = resultado.get(l.anuncioId) ?? []
      dias.push({ dia: paraDia(l.dia), visitas: l._sum.vezes ?? 0, pessoas: l._count._all })
      resultado.set(l.anuncioId, dias)
    }
    return resultado
  }

  async pessoas(anuncioIds: string[]) {
    if (anuncioIds.length === 0) return new Map<string, number>()
    // Um marcador por id, todos como parâmetro: nada do id entra no texto do SQL.
    const linhas = await this.db.$queryRawUnsafe<Array<{ anuncioId: string; pessoas: bigint }>>(
      `SELECT anuncioId, COUNT(DISTINCT chave) AS pessoas FROM visitas_anuncio WHERE anuncioId IN (${anuncioIds.map(() => "?").join(", ")}) GROUP BY anuncioId`,
      ...anuncioIds,
    )
    return new Map(linhas.map((l) => [l.anuncioId, Number(l.pessoas)]))
  }

  async cidades(anuncioId: string): Promise<Array<LocalDaVisita & { pessoas: number }>> {
    const linhas = await this.db.$queryRaw<Array<LocalDaVisita & { pessoas: bigint }>>`
      SELECT cidade, uf, pais, COUNT(DISTINCT chave) AS pessoas FROM visitas_anuncio
      WHERE anuncioId = ${anuncioId} GROUP BY cidade, uf, pais`
    return linhas.map((l) => ({ cidade: l.cidade, uf: l.uf, pais: l.pais, pessoas: Number(l.pessoas) }))
  }
}
