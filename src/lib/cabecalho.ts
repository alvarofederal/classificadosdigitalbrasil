// APRESENTAÇÃO — textos do cabeçalho do jornal (feature 023: RF-230, RF-231, RN-231, RN-232).

import type { Cidade } from "@/domain/localidade/uf"

/** A linha que vai logo abaixo da manchete CLASSIFICADOS, de ponta a ponta (RF-230). */
export const LINHA_DE_BAIXO = "Digitais do Brasil"

/** O lugar das páginas sem cidade (RF-231). */
export const SEM_CIDADE = "Todo o Brasil"

/** RN-231: "Brasília · DF" com cidade; "Todo o Brasil" sem cidade. */
export function lugarDoCabecalho(cidade: Pick<Cidade, "nome" | "uf"> | null | undefined): string {
  return cidade ? `${cidade.nome} · ${cidade.uf}` : SEM_CIDADE
}

export type PecaDaLinha = { tipo: "letra"; letra: string } | { tipo: "vao" }

/**
 * RN-232: a linha vira uma fileira de letras, para o espaço entre elas se dividir por igual na largura da manchete;
 * cada separação entre palavras vira um vão, que deixa o espaço entre as palavras maior que o espaço entre as letras.
 */
export function letrasDaLinha(texto: string): PecaDaLinha[] {
  const palavras = texto.trim().split(/\s+/).filter(Boolean)
  return palavras.flatMap((palavra, i): PecaDaLinha[] => [
    ...(i > 0 ? [{ tipo: "vao" } as const] : []),
    ...Array.from(palavra, (letra) => ({ tipo: "letra", letra }) as const),
  ])
}
