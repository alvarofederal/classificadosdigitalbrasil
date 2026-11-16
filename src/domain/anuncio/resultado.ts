// DOMÍNIO — "Fechou negócio?": o resultado do anúncio contado pelo dono (feature 021: RF-210, RN-210 a RN-212).

/** Catálogo das respostas (Art. 2): resposta nova entra aqui. */
export const RESULTADOS_DO_ANUNCIO = {
  PELO_CLASSIFICADOS: "Sim, pelo Classificados",
  POR_OUTRO_LUGAR: "Sim, por outro lugar",
  AINDA_NAO: "Ainda não",
} as const

export type ResultadoDoAnuncio = keyof typeof RESULTADOS_DO_ANUNCIO

export function ehResultadoDoAnuncio(valor: string): valor is ResultadoDoAnuncio {
  return Object.hasOwn(RESULTADOS_DO_ANUNCIO, valor)
}

/** Fechou negócio, por qualquer caminho: é quando faz sentido oferecer tirar o anúncio do caderno (RF-212). */
export function fechouNegocio(resultado: ResultadoDoAnuncio | null): boolean {
  return resultado === "PELO_CLASSIFICADOS" || resultado === "POR_OUTRO_LUGAR"
}

/** RN-210: só anúncio que já esteve no caderno e não foi removido. */
export function podePerguntarResultado(anuncio: { publicadoEm: Date | null; situacao: string }): boolean {
  return anuncio.publicadoEm !== null && anuncio.situacao !== "REMOVIDO"
}
