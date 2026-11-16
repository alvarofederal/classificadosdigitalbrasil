// APRESENTAÇÃO — o QR Code do anúncio, o mesmo em todo lugar (feature 022: RF-220, RN-220, RN-221).
// Cartaz, página do anúncio, imagens de divulgação e o arquivo do QR passam por aqui.

import QRCode from "qrcode"
import { urlDoSite } from "./site"

/** RN-221: tinta preta no branco, com margem e correção média: lê impresso, em tela e em foto. */
const OPCOES = { margin: 2, errorCorrectionLevel: "M" as const, color: { dark: "#111111", light: "#ffffff" } }

/** RN-220: o QR leva sempre ao link curto do anúncio. */
export function linkCurtoDoAnuncio(codigo: string): string {
  return `${urlDoSite()}/a/${codigo.toUpperCase()}`
}

/** Para pôr direto no HTML ou numa imagem gerada (next/og): `data:image/png;base64,…`. */
export function qrCodeDoAnuncioEmDataUrl(codigo: string, largura: number): Promise<string> {
  return QRCode.toDataURL(linkCurtoDoAnuncio(codigo), { ...OPCOES, width: largura })
}

/** O arquivo PNG do QR, para baixar (RF-223). */
export function qrCodeDoAnuncioEmPng(codigo: string, largura: number): Promise<Buffer> {
  return QRCode.toBuffer(linkCurtoDoAnuncio(codigo), { ...OPCOES, type: "png", width: largura })
}
