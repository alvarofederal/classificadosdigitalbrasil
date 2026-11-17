// Feature 023: DIGITAIS DO BRASIL de ponta a ponta e o lugar da página no cabeçalho (RN-231, RN-232).
import { describe, expect, it } from "vitest"
import { LINHA_DE_BAIXO, SEM_CIDADE, letrasDaLinha, lugarDoCabecalho } from "@/lib/cabecalho"

describe("Cabeçalho de ponta a ponta (feature 023)", () => {
  it("RN-231: com cidade, vem cidade e UF; sem cidade, Todo o Brasil", () => {
    expect(lugarDoCabecalho({ nome: "Brasília", uf: "DF" })).toBe("Brasília · DF")
    expect(lugarDoCabecalho({ nome: "São José dos Campos", uf: "SP" })).toBe("São José dos Campos · SP")
    expect(lugarDoCabecalho(null)).toBe("Todo o Brasil")
    expect(lugarDoCabecalho(undefined)).toBe(SEM_CIDADE)
  })

  it("RN-232: a linha de baixo vira letras, com um vão entre as palavras", () => {
    const pecas = letrasDaLinha(LINHA_DE_BAIXO)
    const escrito = pecas.map((p) => (p.tipo === "vao" ? " " : p.letra)).join("")
    expect(escrito).toBe("Digitais do Brasil")
    expect(pecas.filter((p) => p.tipo === "letra")).toHaveLength(16)
    expect(pecas.filter((p) => p.tipo === "vao")).toHaveLength(2)
  })

  it("RN-232: espaços repetidos ou nas pontas não viram vão a mais; letra acentuada fica inteira", () => {
    expect(letrasDaLinha("  Digitais   do Brasil ").filter((p) => p.tipo === "vao")).toHaveLength(2)
    expect(letrasDaLinha("Amapá").map((p) => (p.tipo === "letra" ? p.letra : " "))).toEqual(["A", "m", "a", "p", "á"])
    expect(letrasDaLinha("   ")).toEqual([])
  })
})
