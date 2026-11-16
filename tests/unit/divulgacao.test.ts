// Feature 020: kit de divulgação (RF-204, RN-201, RN-203, RN-204). Anúncio inventado para o teste.
import { describe, expect, it } from "vitest"
import { RESUMO_DO_TEXTO_PRONTO, nomeDoArquivoDaImagem, resumir, textoParaDivulgar } from "@/domain/anuncio/divulgacao"

const LINK = "https://classificados.teste/a/ABC234"

describe("Kit de divulgação (feature 020)", () => {
  it("RN-203: corta sem partir palavra, tira a pontuação solta e põe reticências", () => {
    expect(resumir("Curto.", 50)).toBe("Curto.")
    expect(resumir("Prata, 2.0 8V,\n câmbio   manual", 100)).toBe("Prata, 2.0 8V, câmbio manual")
    const longo = "Quadro de alumínio, 21 marchas, pneus novos, freio a disco, pouco uso, guardada em casa."
    const r = resumir(longo, 40)
    expect(r.length).toBeLessThanOrEqual(40)
    expect(r).toBe("Quadro de alumínio, 21 marchas, pneus…")
    expect(resumir("Palavraenormesemespacoalgumnotexto", 10)).toBe("Palavraen…")
  })

  it("RF-204 e RN-204: título em maiúsculas, preço e cidade, começo do texto e o link curto", () => {
    const texto = textoParaDivulgar(
      { titulo: "Bicicleta aro 29", texto: "Quadro de alumínio, 21 marchas. Pouco uso.", precoCentavos: 90_000 },
      "Brasília/DF",
      LINK,
    )
    expect(texto).toBe(["BICICLETA ARO 29", "R$ 900,00 · Brasília/DF", "Quadro de alumínio, 21 marchas. Pouco uso.", `Detalhes e contato: ${LINK}`].join("\n"))
  })

  it("sem preço nem cidade, a linha some; texto longo vem resumido", () => {
    const texto = textoParaDivulgar({ titulo: "Faço fretes", texto: "Caminhonete baú. ".repeat(30), precoCentavos: null }, null, LINK)
    const linhas = texto.split("\n")
    expect(linhas).toHaveLength(3)
    expect(linhas[1].length).toBeLessThanOrEqual(RESUMO_DO_TEXTO_PRONTO)
    expect(linhas[1].endsWith("…")).toBe(true)
  })

  it("RN-201: o texto pronto só usa título, texto, preço e cidade (o que a página pública mostra)", () => {
    const texto = textoParaDivulgar({ titulo: "Mesa", texto: "Seis lugares.", precoCentavos: 50_000 }, "Brasília/DF", LINK)
    expect(texto).not.toMatch(/@|\(\d{2}\)|\d{3}\.\d{3}\.\d{3}-\d{2}/)
  })

  it("o arquivo baixado leva o código do anúncio e o formato", () => {
    expect(nomeDoArquivoDaImagem("4DPUMX", "status")).toBe("classificados-4dpumx-status.png")
    expect(nomeDoArquivoDaImagem("4DPUMX", "quadrado")).toBe("classificados-4dpumx-quadrado.png")
  })
})
