// APRESENTAÇÃO — fontes para as imagens de prévia (next/og). Busca no Google Fonts só os caracteres usados.
// Se falhar, a imagem sai com a fonte padrão (não quebra a prévia).

export async function carregarFonte(familia: string, texto: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${familia}&text=${encodeURIComponent(texto)}`)).text()
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1]
    return url ? await (await fetch(url)).arrayBuffer() : null
  } catch {
    return null
  }
}
