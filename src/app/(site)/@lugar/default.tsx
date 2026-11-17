// APRESENTAÇÃO — o lugar da página na linha fina do cabeçalho (feature 023: RF-231, ADR-23).
// Rota paralela: cada endereço de (site) tem a sua página aqui, porque na navegação sem recarregar
// um espaço sem página para o endereço novo guardaria a cidade da página anterior.
// Este é o padrão, para o que não tem página própria: Todo o Brasil.

import { lugarDoCabecalho } from "@/lib/cabecalho"

export default function LugarPadrao() {
  return lugarDoCabecalho(null)
}
