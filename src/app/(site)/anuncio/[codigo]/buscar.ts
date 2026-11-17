// APRESENTAÇÃO — o anúncio no ar e a cidade dele, pelo código do endereço.
// Com `cache` do React, a página, o título da aba e o lugar do cabeçalho (feature 023, ADR-23) fazem uma consulta só.

import { cache } from "react"
import { codigoValido } from "@/domain/anuncio/anuncio"
import { container } from "@/infrastructure/container"

export const buscarAnuncio = cache(async (codigoParam: string) => {
  const codigo = codigoParam.toUpperCase()
  if (!codigoValido(codigo)) return null
  const c = container()
  const anuncio = await c.classificados.anuncioNoAr(codigo, c.relogio.agora())
  const cidade = anuncio ? c.localidades.cidade(anuncio.cidadeCodigo) : null
  return anuncio && cidade ? { anuncio, cidade } : null
})
