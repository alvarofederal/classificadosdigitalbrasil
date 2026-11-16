// Feature 019: palavra grande no alto do cartaz A4 (RN-190, RN-191).
import { describe, expect, it } from "vitest"
import { TITULOS_DO_CARTAZ, tituloDoCartaz, tituloPadraoDoCartaz } from "@/domain/anuncio/cartaz"

describe("Cartaz com VENDE-SE (feature 019)", () => {
  it("RN-190: vem VENDE-SE nas seções de venda e CLASSIFICADOS onde vender não faz sentido", () => {
    expect(tituloPadraoDoCartaz("veiculos")).toBe("vende-se")
    expect(tituloPadraoDoCartaz("imoveis")).toBe("vende-se")
    expect(tituloPadraoDoCartaz("eletronicos-e-informatica")).toBe("vende-se")
    expect(tituloPadraoDoCartaz("servicos-profissionais")).toBe("classificados")
    expect(tituloPadraoDoCartaz("empregos-e-formacao-profissional")).toBe("classificados")
    expect(tituloPadraoDoCartaz("festas-e-eventos")).toBe("classificados")
  })

  it("RN-191: a escolha do endereço vale; valor desconhecido volta ao padrão da seção", () => {
    expect(tituloDoCartaz("aluga-se", "imoveis")).toBe("aluga-se")
    expect(tituloDoCartaz(" CLASSIFICADOS ", "veiculos")).toBe("classificados")
    expect(tituloDoCartaz("vende-se", "servicos-profissionais")).toBe("vende-se")
    expect(tituloDoCartaz("compra-se", "veiculos")).toBe("vende-se")
    expect(tituloDoCartaz("toString", "veiculos")).toBe("vende-se")
    expect(tituloDoCartaz(null, "servicos-profissionais")).toBe("classificados")
  })

  it("o catálogo tem as três palavras do cartaz", () => {
    expect(Object.values(TITULOS_DO_CARTAZ)).toEqual(["Vende-se", "Aluga-se", "Classificados"])
  })
})
