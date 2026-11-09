// APRESENTAÇÃO — prévia do link no WhatsApp e nas redes: o recorte do anúncio com a manchete (feature 005: RF-73).

import { ImageResponse } from "next/og"
import { codigoValido } from "@/domain/anuncio/anuncio"
import { container } from "@/infrastructure/container"
import { formatarReais } from "@/lib/formatadores"

export const alt = "Anúncio no Classificados Digitais do Brasil"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function Imagem({ params }: { params: Promise<{ codigo: string }> }) {
  const codigo = (await params).codigo.toUpperCase()
  const c = container()
  const anuncio = codigoValido(codigo) ? await c.classificados.anuncioNoAr(codigo, c.relogio.agora()) : null
  const cidade = anuncio ? c.localidades.cidade(anuncio.cidadeCodigo) : null
  const titulo = anuncio?.titulo.toUpperCase() ?? "ANUNCIE AQUI"
  const texto = anuncio ? (anuncio.texto.length > 170 ? `${anuncio.texto.slice(0, 167)}…` : anuncio.texto) : "Classificados por cidade no formato do jornal."
  const preco = anuncio?.precoCentavos != null ? formatarReais(anuncio.precoCentavos) : null

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#ffffff", padding: "40px 56px", color: "#111111" }}>
        <div style={{ display: "flex", justifyContent: "center", fontSize: 108, fontWeight: 900, letterSpacing: -2, lineHeight: 1 }}>CLASSIFICADOS</div>
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "3px solid #111", borderBottom: "1px solid #111", marginTop: 10, padding: "4px 0", fontSize: 20, letterSpacing: 4 }}>
          <span>DIGITAIS DO BRASIL</span>
          <span>{cidade ? `${cidade.nome.toUpperCase()}/${cidade.uf} · ${anuncio?.categoriaNome.toUpperCase()}` : ""}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, marginTop: 26, border: "6px double #111", padding: "22px 30px" }}>
          <div style={{ display: "flex", background: "#111", color: "#fff", fontSize: 52, fontWeight: 800, padding: "6px 14px" }}>{titulo}</div>
          <div style={{ display: "flex", fontSize: 32, lineHeight: 1.3, marginTop: 16 }}>{texto}</div>
          {preco && <div style={{ display: "flex", fontSize: 48, fontWeight: 800, marginTop: "auto" }}>{preco}</div>}
        </div>
      </div>
    ),
    size,
  )
}
