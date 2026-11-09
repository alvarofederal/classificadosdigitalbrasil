// APRESENTAÇÃO — textos de preço a partir da tabela de planos (feature 003).

import { type Plano, RECURSOS_DO_PLANO, type CodigoDoPlano } from "@/domain/plano/plano"
import { formatarReais } from "./formatadores"

/** "R$ 1,00 por 7 dias" — o plano mais barato à venda. */
export function precoInicial(planos: Plano[]): string {
  const maisBarato = [...planos].sort((a, b) => a.valor7DiasCentavos - b.valor7DiasCentavos)[0]
  return maisBarato ? `${formatarReais(maisBarato.valor7DiasCentavos)} por 7 dias` : "R$ 1,00 por 7 dias"
}

export const NOMES_DOS_PLANOS: Record<CodigoDoPlano, string> = {
  SIMPLES: "Simples",
  FOTOS: "Com fotos",
  DESTAQUE: "Destaque",
  VITRINE: "Vitrine",
}

/** O que o plano garante, em palavras, além da descrição editável. */
export function vantagensDoPlano(plano: Plano): string[] {
  const recursos = RECURSOS_DO_PLANO[plano.codigo]
  return [
    plano.maxFotos === 0 ? "Sem fotos" : plano.maxFotos === 1 ? "1 foto" : `Álbum de ${plano.maxFotos} fotos`,
    "Mensagens dos interessados",
    "Página própria para divulgar",
    ...(recursos.destaque ? ["Moldura de destaque"] : []),
    ...(recursos.prioridade > 0 ? [recursos.vitrine ? "Topo da seção" : "Antes dos planos menores"] : []),
  ]
}
