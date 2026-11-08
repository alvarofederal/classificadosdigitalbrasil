// APRESENTAÇÃO — URLs de entrega do Cloudinary (RNF-02): formato e qualidade automáticos, tamanho sob medida.

const MARCADOR = "/image/upload/"

export function urlImagem(url: string, { largura, altura, recorte = false }: { largura: number; altura?: number; recorte?: boolean }): string {
  const posicao = url.indexOf(MARCADOR)
  if (!url.includes("res.cloudinary.com") || posicao < 0) return url // imagens locais (seed de demonstração)
  const transformacao = ["f_auto", "q_auto", recorte ? "c_fill,g_auto" : "c_limit", `w_${largura}`, altura ? `h_${altura}` : null]
    .filter(Boolean)
    .join(",")
  const inicio = posicao + MARCADOR.length
  return `${url.slice(0, inicio)}${transformacao}/${url.slice(inicio)}`
}

export function srcSetImagem(url: string, larguras: number[], proporcao?: number, recorte = false): string | undefined {
  if (!url.includes("res.cloudinary.com")) return undefined
  return larguras
    .map((largura) => `${urlImagem(url, { largura, altura: proporcao ? Math.round(largura / proporcao) : undefined, recorte })} ${largura}w`)
    .join(", ")
}

/** Capa recortada no tamanho de prévia do WhatsApp/Open Graph (RF-23). */
export function urlOpenGraph(url: string): string {
  return urlImagem(url, { largura: 1200, altura: 630, recorte: true })
}
