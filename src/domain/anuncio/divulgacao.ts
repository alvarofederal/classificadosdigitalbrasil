// DOMÍNIO — texto pronto e resumo para divulgar o anúncio (feature 020: RF-204, RN-201, RN-203, RN-204).
// Só entra o que a página pública mostra a qualquer visitante: nunca dados do dono (Art. 5).

import { formatarReais } from "../shared/dinheiro"

/** RN-203: corta no tamanho sem partir palavra, com reticências; espaços e quebras viram um espaço só. */
export function resumir(texto: string, maximo: number): string {
  const limpo = texto.replace(/\s+/g, " ").trim()
  if (limpo.length <= maximo) return limpo
  const corte = limpo.slice(0, maximo - 1)
  const ultimoEspaco = corte.lastIndexOf(" ")
  const base = ultimoEspaco > maximo * 0.6 ? corte.slice(0, ultimoEspaco) : corte
  return `${base.replace(/[\s,;:.\-–—]+$/, "")}…`
}

export interface AnuncioParaDivulgar {
  titulo: string
  texto: string
  precoCentavos: number | null
}

/** Tamanho do começo do texto no texto pronto: cabe na prévia do WhatsApp sem virar um bloco. */
export const RESUMO_DO_TEXTO_PRONTO = 160

/**
 * RF-204 e RN-204: o texto para colar no WhatsApp, nos grupos e nas redes. Título, preço e cidade, o começo do texto
 * e o link curto, que é por onde o comprador vê as fotos e fala com o dono sem expor o telefone de ninguém.
 */
export function textoParaDivulgar(anuncio: AnuncioParaDivulgar, cidade: string | null, linkCurto: string): string {
  const linhaDoPreco = [anuncio.precoCentavos !== null ? formatarReais(anuncio.precoCentavos) : null, cidade].filter(Boolean).join(" · ")
  return [anuncio.titulo.trim().toUpperCase(), linhaDoPreco, resumir(anuncio.texto, RESUMO_DO_TEXTO_PRONTO), `Detalhes e contato: ${linkCurto}`]
    .filter((linha) => linha.length > 0)
    .join("\n")
}

/** Nome do arquivo baixado: o código do anúncio e o formato, sem acento nem espaço. */
export function nomeDoArquivoDaImagem(codigo: string, formato: "status" | "quadrado"): string {
  return `classificados-${codigo.toLowerCase()}-${formato}.png`
}
