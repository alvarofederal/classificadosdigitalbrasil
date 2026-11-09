// APRESENTAÇÃO — prévia do link no WhatsApp e nas redes: o recorte do anúncio com a manchete (feature 005: RF-73).

import { ImageResponse } from "next/og"
import { codigoValido } from "@/domain/anuncio/anuncio"
import { container } from "@/infrastructure/container"
import { formatarReais } from "@/lib/formatadores"

export const alt = "Anúncio no Classificados Digitais do Brasil"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

/** Busca no Google Fonts só os caracteres usados (padrão do next/og). Se falhar, a imagem sai com a fonte padrão. */
async function carregarFonte(familia: string, texto: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${familia}&text=${encodeURIComponent(texto)}`)).text()
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1]
    return url ? await (await fetch(url)).arrayBuffer() : null
  } catch {
    return null
  }
}

export default async function Imagem({ params }: { params: Promise<{ codigo: string }> }) {
  const codigo = (await params).codigo.toUpperCase()
  const c = container()
  const anuncio = codigoValido(codigo) ? await c.classificados.anuncioNoAr(codigo, c.relogio.agora()) : null
  const cidade = anuncio ? c.localidades.cidade(anuncio.cidadeCodigo) : null
  const titulo = anuncio?.titulo.toUpperCase() ?? "ANUNCIE AQUI"
  const texto = anuncio ? (anuncio.texto.length > 170 ? `${anuncio.texto.slice(0, 167)}…` : anuncio.texto) : "Classificados por cidade no formato do jornal."
  const preco = anuncio?.precoCentavos != null ? formatarReais(anuncio.precoCentavos) : null
  const manchete = await carregarFonte("Anton", `CLASSIFICADOS${titulo}${preco ?? ""}`)
  const ANTON = manchete ? "Anton" : undefined
  const faixaDeCima = cidade ? `${cidade.nome.toUpperCase()}/${cidade.uf} · ${anuncio?.categoriaNome.toUpperCase()}` : ""
  const corpo = await carregarFonte("PT+Serif", `DIGITAIS DO BRASIL${faixaDeCima}${texto}`)
  const fontes = [
    ...(manchete ? [{ name: "Anton", data: manchete, style: "normal" as const, weight: 400 as const }] : []),
    ...(corpo ? [{ name: "PT Serif", data: corpo, style: "normal" as const, weight: 400 as const }] : []),
  ]

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#ffffff", padding: "40px 56px", color: "#111111", fontFamily: corpo ? "PT Serif" : undefined }}>
        <div style={{ display: "flex", justifyContent: "center", fontSize: 118, fontFamily: ANTON, letterSpacing: 1, lineHeight: 1 }}>CLASSIFICADOS</div>
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "3px solid #111", borderBottom: "1px solid #111", marginTop: 10, padding: "4px 0", fontSize: 20, letterSpacing: 4 }}>
          <span>DIGITAIS DO BRASIL</span>
          <span>{faixaDeCima}</span>
        </div>
        {/* O gerador de imagem não aceita borda "double": duas bordas simples, uma dentro da outra. */}
        <div style={{ display: "flex", flex: 1, marginTop: 26, border: "3px solid #111", padding: 4 }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, border: "2px solid #111", padding: "20px 28px" }}>
            <div style={{ display: "flex", background: "#111", color: "#fff", fontSize: 54, fontFamily: ANTON, padding: "4px 14px" }}>{titulo}</div>
            <div style={{ display: "flex", fontSize: 32, lineHeight: 1.3, marginTop: 16 }}>{texto}</div>
            {preco && <div style={{ display: "flex", fontSize: 52, fontFamily: ANTON, marginTop: "auto" }}>{preco}</div>}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: fontes.length > 0 ? fontes : undefined },
  )
}
