// Feature 022: QR Code do anúncio (RF-220, RN-220, RN-221).
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { linkCurtoDoAnuncio, qrCodeDoAnuncioEmDataUrl, qrCodeDoAnuncioEmPng } from "@/lib/qrcode"

const ENDERECO = process.env.NEXT_PUBLIC_URL
beforeEach(() => {
  process.env.NEXT_PUBLIC_URL = "https://classificados.teste/"
})
afterEach(() => {
  process.env.NEXT_PUBLIC_URL = ENDERECO
})

describe("QR Code do anúncio (feature 022)", () => {
  it("RN-220: leva ao link curto do anúncio, com o código em maiúsculas", () => {
    expect(linkCurtoDoAnuncio("4dpumx")).toBe("https://classificados.teste/a/4DPUMX")
  })

  it("RF-220: sai como data URL para o HTML e como PNG para baixar", async () => {
    expect(await qrCodeDoAnuncioEmDataUrl("4DPUMX", 200)).toMatch(/^data:image\/png;base64,/)
    const png = await qrCodeDoAnuncioEmPng("4DPUMX", 300)
    expect(png.subarray(1, 4).toString("ascii")).toBe("PNG")
  })
})
