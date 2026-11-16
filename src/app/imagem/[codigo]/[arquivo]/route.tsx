// APRESENTAÇÃO — imagens do kit de divulgação (feature 020: RF-201, RF-202; RN-200 a RN-202, RN-204).
// status.png (1080 × 1920) para o status do WhatsApp; quadrado.png (1080 × 1080) para grupos e redes.
// Mesma técnica da prévia do link (feature 005, RF-73): next/og, fontes do Google só com os caracteres usados.

import { ImageResponse } from "next/og"
import { codigoValido } from "@/domain/anuncio/anuncio"
import { TITULOS_DO_CARTAZ, tituloDoCartaz } from "@/domain/anuncio/cartaz"
import { resumir } from "@/domain/anuncio/divulgacao"
import { container } from "@/infrastructure/container"
import { formatarReais } from "@/lib/formatadores"
import { urlImagem } from "@/lib/imagens"
import { carregarFonte } from "@/lib/og"
import { urlDoSite } from "@/lib/site"

export const dynamic = "force-dynamic"

const FORMATOS = {
  "status.png": { largura: 1080, altura: 1920 },
  "quadrado.png": { largura: 1080, altura: 1080 },
} as const

const TINTA = "#111111"

export async function GET(_requisicao: Request, { params }: { params: Promise<{ codigo: string; arquivo: string }> }) {
  const { codigo: bruto, arquivo } = await params
  const codigo = bruto.toUpperCase()
  if (!Object.hasOwn(FORMATOS, arquivo) || !codigoValido(codigo)) return new Response("Não encontrado.", { status: 404 })
  const c = container()
  // RN-200: só anúncio no ar.
  const anuncio = await c.classificados.anuncioNoAr(codigo, c.relogio.agora())
  if (!anuncio) return new Response("Não encontrado.", { status: 404 })

  const formato = FORMATOS[arquivo as keyof typeof FORMATOS]
  const vertical = arquivo === "status.png"
  const cidade = c.localidades.cidade(anuncio.cidadeCodigo)
  const lugar = cidade ? `${cidade.nome.toUpperCase()}/${cidade.uf}` : anuncio.uf
  const secao = anuncio.categoriaNome.toUpperCase()
  const ondeEQue = `${lugar} · ${secao}`
  const palavra = tituloDoCartaz(null, anuncio.categoriaSlug)
  const vendeSe = palavra !== "classificados" ? TITULOS_DO_CARTAZ[palavra].toUpperCase() : null
  const titulo = anuncio.titulo.toUpperCase()
  const preco = anuncio.precoCentavos !== null ? formatarReais(anuncio.precoCentavos) : null
  // RN-204: o link curto, sem o "https://", em letra grande.
  const link = `${urlDoSite()}/a/${anuncio.codigo}`.replace(/^https?:\/\//, "")

  // RN-202: a foto entra só se houver; em JPG, que o gerador lê.
  const primeira = anuncio.fotos[0]?.url
  const foto = primeira ? urlImagem(primeira.startsWith("/") ? `${urlDoSite()}${primeira}` : primeira, { largura: 1000, formato: "jpg" }) : null
  // RN-203: o texto do tamanho que cabe; sem foto, cabe mais.
  // Medido com o Astra (foto, texto de 267 letras e preço) em 2026-11-16: com 230 letras o conteúdo não cabia na vertical.
  const texto = resumir(anuncio.texto, vertical ? (foto ? 160 : 420) : foto ? 120 : 260)

  const [manchete, corpo] = await Promise.all([
    carregarFonte("Anton", `CLASSIFICADOS${vendeSe ?? ""}: ${titulo}${preco ?? ""}`),
    carregarFonte("PT+Serif", `DIGITAIS DO BRASIL${ondeEQue}${texto}Fotos e contato:${link}`),
  ])
  const ANTON = manchete ? "Anton" : undefined
  const fontes = [
    ...(manchete ? [{ name: "Anton", data: manchete, style: "normal" as const, weight: 400 as const }] : []),
    ...(corpo ? [{ name: "PT Serif", data: corpo, style: "normal" as const, weight: 400 as const }] : []),
  ]

  const cabecalho = (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "center", fontSize: vertical ? 168 : 112, fontFamily: ANTON, lineHeight: 1 }}>CLASSIFICADOS</div>
      {/* Jornal e cidade na faixa; a seção, que pode ter nome comprido, na linha de baixo. */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          borderTop: `4px solid ${TINTA}`,
          borderBottom: `2px solid ${TINTA}`,
          marginTop: 10,
          padding: "6px 0",
          fontSize: vertical ? 26 : 22,
          letterSpacing: 3,
        }}
      >
        <span>DIGITAIS DO BRASIL</span>
        <span>{lugar}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginTop: 8, fontSize: vertical ? 30 : 24, letterSpacing: 2 }}>{secao}</div>
    </div>
  )

  const rodape = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", borderTop: `3px solid ${TINTA}`, paddingTop: vertical ? 24 : 14 }}>
      <div style={{ display: "flex", fontSize: vertical ? 34 : 26 }}>Fotos e contato:</div>
      <div style={{ display: "flex", fontSize: vertical ? 38 : 34, fontWeight: 700, textAlign: "center" }}>{link}</div>
    </div>
  )

  const imagemDaFoto = (largura: number, altura: number) =>
    foto ? (
      <div style={{ display: "flex", width: largura, height: altura, border: `2px solid ${TINTA}`, alignItems: "center", justifyContent: "center", background: "#fff" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={foto} alt="" width={largura - 4} height={altura - 4} style={{ objectFit: "contain" }} />
      </div>
    ) : null

  const conteudo = vertical ? (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, marginTop: 20, border: `4px solid ${TINTA}`, padding: 6 }}>
      {/* Conteúdo no centro da moldura: sem foto, a sobra fica dividida em cima e embaixo, e não num buraco só. */}
      {/* flexShrink 0: se faltar espaço, nada se espreme por cima do vizinho. */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", gap: foto ? 22 : 40, border: `2px solid ${TINTA}`, padding: "24px 34px" }}>
        {vendeSe && <div style={{ display: "flex", flexShrink: 0, justifyContent: "center", fontSize: foto ? 120 : 190, fontFamily: ANTON, lineHeight: 1 }}>{vendeSe}</div>}
        <div style={{ display: "flex", flexShrink: 0, justifyContent: "center", textAlign: "center", background: TINTA, color: "#fff", fontSize: foto ? 58 : 80, fontFamily: ANTON, padding: "8px 16px", lineHeight: 1.15 }}>
          {titulo}
        </div>
        {foto && <div style={{ display: "flex", flexShrink: 0 }}>{imagemDaFoto(872, 520)}</div>}
        <div style={{ display: "flex", flexShrink: 0, fontSize: foto ? 38 : 56, lineHeight: 1.3, textAlign: "center", justifyContent: "center" }}>{texto}</div>
        {preco && <div style={{ display: "flex", flexShrink: 0, justifyContent: "center", fontSize: foto ? 104 : 150, fontFamily: ANTON, lineHeight: 1 }}>{preco}</div>}
      </div>
    </div>
  ) : (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, marginTop: 20, border: `4px solid ${TINTA}`, padding: 5 }}>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, border: `2px solid ${TINTA}`, padding: "18px 24px" }}>
        <div style={{ display: "flex", background: TINTA, color: "#fff", fontSize: 50, fontFamily: ANTON, padding: "6px 14px", lineHeight: 1.15 }}>
          {vendeSe ? `${vendeSe}: ${titulo}` : titulo}
        </div>
        {foto ? (
          <div style={{ display: "flex", flex: 1, marginTop: 18, gap: 22 }}>
            {imagemDaFoto(440, 440)}
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div style={{ display: "flex", fontSize: 30, lineHeight: 1.3 }}>{texto}</div>
              {preco && <div style={{ display: "flex", fontSize: 84, fontFamily: ANTON, marginTop: "auto", lineHeight: 1 }}>{preco}</div>}
            </div>
          </div>
        ) : (
          // Sem foto: texto maior e tudo no centro, sem um buraco no meio.
          <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", alignItems: "center", gap: 30 }}>
            <div style={{ display: "flex", fontSize: 46, lineHeight: 1.3, textAlign: "center", justifyContent: "center" }}>{texto}</div>
            {preco && <div style={{ display: "flex", fontSize: 110, fontFamily: ANTON, lineHeight: 1 }}>{preco}</div>}
          </div>
        )}
      </div>
    </div>
  )

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#ffffff",
          color: TINTA,
          padding: vertical ? "64px 60px 56px" : "40px 44px 32px",
          fontFamily: corpo ? "PT Serif" : undefined,
          gap: vertical ? 28 : 16,
        }}
      >
        {cabecalho}
        {conteudo}
        {rodape}
      </div>
    ),
    {
      width: formato.largura,
      height: formato.altura,
      fonts: fontes.length > 0 ? fontes : undefined,
      // O anúncio muda quando o dono edita: cache curto.
      headers: { "Cache-Control": "public, max-age=300" },
    },
  )
}
