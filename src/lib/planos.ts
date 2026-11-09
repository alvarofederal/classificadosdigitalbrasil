// APRESENTAÇÃO — textos de preço a partir da tabela de planos (features 003 e 009).

import { type CodigoDoPlano, type Plano, RECURSOS_DO_PLANO, menorPreco } from "@/domain/plano/plano"
import { formatarReais } from "./formatadores"

/** "R$ 1,00 por 7 dias" — o menor preço à venda. */
export function precoInicial(planos: Plano[]): string {
  const menor = menorPreco(planos)
  return menor ? `${formatarReais(menor.valorCentavos)} por ${menor.dias} dias` : "R$ 1,00 por 7 dias"
}

export const NOMES_DOS_PLANOS: Record<CodigoDoPlano, string> = {
  SIMPLES: "Simples",
  FOTOS: "Com foto",
  DESTAQUE: "Destaque",
  VITRINE: "Vitrine",
}

/** O que o plano garante, em palavras, além da descrição editável. */
export function vantagensDoPlano(plano: Plano): string[] {
  const recursos = RECURSOS_DO_PLANO[plano.codigo]
  return [
    plano.maxFotos === 0 ? "Sem fotos" : plano.maxFotos === 1 ? "1 foto" : `Até ${plano.maxFotos} fotos`,
    "Página própria para divulgar",
    "Chat com os interessados",
    ...(recursos.destaque ? ["Moldura de destaque"] : []),
    ...(recursos.prioridade > 1 ? [recursos.vitrine ? "Topo da seção" : "Antes dos planos menores"] : []),
  ]
}
