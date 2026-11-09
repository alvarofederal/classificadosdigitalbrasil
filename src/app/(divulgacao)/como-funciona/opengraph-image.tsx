// APRESENTAÇÃO — prévia do link da página de divulgação no WhatsApp e nas redes.

import { ImageResponse } from "next/og"
import { container } from "@/infrastructure/container"
import { carregarFonte } from "@/lib/og"
import { precoInicial } from "@/lib/planos"

export const alt = "Classificados Digitais do Brasil: anuncie na sua cidade"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
// O preço vem do painel: a imagem é gerada a cada pedido, não no build.
export const dynamic = "force-dynamic"

export default async function Imagem() {
  const planos = await container()
    .classificados.planosAVenda()
    .catch(() => [])
  const preco = `A PARTIR DE ${precoInicial(planos).toUpperCase()}`
  const chamada = "ANUNCIE NO CADERNO DA SUA CIDADE"
  const texto = "Classificados por cidade no formato do jornal. Página própria, mensagens e cartaz com QR Code. Pagamento por Pix."
  const anton = await carregarFonte("Anton", `CLASSIFICADOS${chamada}${preco}`)
  const serif = await carregarFonte("PT+Serif", `DIGITAIS DO BRASIL${texto}`)
  const fontes = [
    ...(anton ? [{ name: "Anton", data: anton, style: "normal" as const, weight: 400 as const }] : []),
    ...(serif ? [{ name: "PT Serif", data: serif, style: "normal" as const, weight: 400 as const }] : []),
  ]
  const ANTON = anton ? "Anton" : undefined

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#fff", color: "#111", padding: "40px 56px", fontFamily: serif ? "PT Serif" : undefined }}>
        <div style={{ display: "flex", justifyContent: "center", fontSize: 130, fontFamily: ANTON, lineHeight: 1 }}>CLASSIFICADOS</div>
        <div style={{ display: "flex", justifyContent: "center", borderTop: "3px solid #111", borderBottom: "1px solid #111", marginTop: 10, padding: "4px 0", fontSize: 22, letterSpacing: 8 }}>
          DIGITAIS DO BRASIL
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, justifyContent: "center", gap: 16 }}>
          <div style={{ display: "flex", background: "#111", color: "#fff", fontSize: 56, fontFamily: ANTON, padding: "6px 22px" }}>{chamada}</div>
          <div style={{ display: "flex", fontSize: 30, textAlign: "center", lineHeight: 1.3, maxWidth: 980 }}>{texto}</div>
          <div style={{ display: "flex", fontSize: 44, fontFamily: ANTON }}>{preco}</div>
        </div>
      </div>
    ),
    { ...size, fonts: fontes.length > 0 ? fontes : undefined },
  )
}
