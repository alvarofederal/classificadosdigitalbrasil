// Feature 011 — anúncios no Google: entradas do sitemap e dados estruturados (JSON-LD) da página do anúncio.
import { describe, expect, it } from "vitest"
import type { AnuncioPublicoDTO } from "@/application/queries/consultas"
import { ESTILO_PADRAO } from "@/domain/anuncio/anuncio"
import type { Cidade } from "@/domain/localidade/uf"
import { dadosEstruturadosDoAnuncio, entradasDeAnuncios, jsonLdSeguro } from "@/lib/dados-estruturados"

const BASE = "https://classificados.teste"
const BRASILIA: Cidade = { codigo: 5300108, nome: "Brasília", slug: "brasilia", uf: "DF" }

const ASTRA: AnuncioPublicoDTO = {
  id: "a1",
  codigo: "4DPUMX",
  titulo: "Astra Sedan Expression 2002",
  texto: "Prata, 2.0 8V, câmbio manual, 230 mil km.",
  precoCentavos: 2_000_000,
  estilo: ESTILO_PADRAO,
  planoCodigo: "FOTOS",
  fotos: [
    { id: "f1", url: "https://res.cloudinary.com/conta/image/upload/v1/anuncios/a1/capa.jpg" },
    { id: "f2", url: "https://res.cloudinary.com/conta/image/upload/v1/anuncios/a1/painel.jpg" },
  ],
  uf: "DF",
  cidadeCodigo: 5300108,
  categoriaNome: "Veículos",
  categoriaSlug: "veiculos",
  // 18/11/2026 às 14:26 em Brasília (17:26 UTC).
  expiraEm: new Date("2026-11-18T17:26:00Z"),
}

type No = Record<string, unknown>

function grafo(anuncio: AnuncioPublicoDTO): No[] {
  return dadosEstruturadosDoAnuncio({ anuncio, cidade: BRASILIA, base: BASE })["@graph"] as No[]
}

function doTipo(nos: No[], tipo: string): No | undefined {
  return nos.find((no) => no["@type"] === tipo)
}

describe("Sitemap com os anúncios (RF-110, RN-114)", () => {
  it("RF-110: cada anúncio vira o endereço público com a data de publicação, na ordem recebida", () => {
    const publicado = new Date("2026-11-11T17:26:00Z")
    const entradas = entradasDeAnuncios(BASE, [
      { codigo: "4DPUMX", publicadoEm: publicado },
      { codigo: "9TTTMQ", publicadoEm: null },
    ])
    expect(entradas).toEqual([
      { url: `${BASE}/anuncio/4DPUMX`, lastModified: publicado, changeFrequency: "weekly", priority: 0.6 },
      { url: `${BASE}/anuncio/9TTTMQ`, changeFrequency: "weekly", priority: 0.6 },
    ])
  })

  it("RN-114: passa do limite, ficam só os primeiros (os publicados mais recentemente)", () => {
    const anuncios = ["AAAAAA", "BBBBBB", "CCCCCC"].map((codigo) => ({ codigo, publicadoEm: null }))
    expect(entradasDeAnuncios(BASE, anuncios, 2).map((e) => e.url)).toEqual([`${BASE}/anuncio/AAAAAA`, `${BASE}/anuncio/BBBBBB`])
  })
})

describe("Dados estruturados do anúncio (RF-111, RF-112, RN-110 a RN-113)", () => {
  it("RF-111: a trilha vai de Início à cidade, à seção e ao anúncio, com endereços completos", () => {
    const trilha = doTipo(grafo(ASTRA), "BreadcrumbList")
    expect(trilha?.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Início", item: `${BASE}/` },
      { "@type": "ListItem", position: 2, name: "Brasília/DF", item: `${BASE}/df/brasilia` },
      { "@type": "ListItem", position: 3, name: "Veículos", item: `${BASE}/df/brasilia/veiculos` },
      { "@type": "ListItem", position: 4, name: "Astra Sedan Expression 2002", item: `${BASE}/anuncio/4DPUMX` },
    ])
  })

  it("RF-112: com preço, o anúncio vira produto com oferta em reais, válida até sair do ar, na cidade", () => {
    const produto = doTipo(grafo(ASTRA), "Product")
    expect(produto).toMatchObject({
      name: "Astra Sedan Expression 2002",
      description: "Prata, 2.0 8V, câmbio manual, 230 mil km.",
      category: "Veículos",
      sku: "4DPUMX",
      url: `${BASE}/anuncio/4DPUMX`,
      offers: {
        "@type": "Offer",
        url: `${BASE}/anuncio/4DPUMX`,
        price: "20000.00",
        priceCurrency: "BRL",
        availability: "https://schema.org/InStock",
        priceValidUntil: "2026-11-18",
        availableAtOrFrom: {
          "@type": "Place",
          address: { "@type": "PostalAddress", addressLocality: "Brasília", addressRegion: "DF", addressCountry: "BR" },
        },
      },
    })
    // As fotos na ordem do álbum, em tamanho de vitrine.
    expect(produto?.image).toEqual([
      "https://res.cloudinary.com/conta/image/upload/f_auto,q_auto,c_limit,w_1200/v1/anuncios/a1/capa.jpg",
      "https://res.cloudinary.com/conta/image/upload/f_auto,q_auto,c_limit,w_1200/v1/anuncios/a1/painel.jpg",
    ])
  })

  it("RF-112: centavos viram preço com ponto e duas casas; validade conta o dia de Brasília", () => {
    const anuncio = { ...ASTRA, precoCentavos: 5_005, expiraEm: new Date("2026-11-19T02:30:00Z") }
    const oferta = doTipo(grafo(anuncio), "Product")?.offers as No
    expect(oferta.price).toBe("50.05")
    // 02:30 UTC do dia 19 ainda é dia 18 em Brasília.
    expect(oferta.priceValidUntil).toBe("2026-11-18")
  })

  it("RF-112: anúncio sem fotos não leva o campo de imagem", () => {
    expect(doTipo(grafo({ ...ASTRA, fotos: [] }), "Product")).not.toHaveProperty("image")
  })

  it("RN-111: sem preço, fica só a trilha", () => {
    const nos = grafo({ ...ASTRA, precoCentavos: null })
    expect(nos.map((no) => no["@type"])).toEqual(["BreadcrumbList"])
  })

  it("RN-112: Empregos e Formação Profissional não vira produto, mesmo com preço", () => {
    const aula = { ...ASTRA, titulo: "Aulas de reforço", precoCentavos: 5_000, categoriaNome: "Empregos e Formação Profissional", categoriaSlug: "empregos-e-formacao-profissional" }
    expect(grafo(aula).map((no) => no["@type"])).toEqual(["BreadcrumbList"])
  })

  it("RN-110: nada de dono, vendedor ou contato nos dados", () => {
    const texto = JSON.stringify(dadosEstruturadosDoAnuncio({ anuncio: ASTRA, cidade: BRASILIA, base: BASE }))
    for (const campo of ["seller", "author", "email", "telephone", "brand", "review", "aggregateRating"]) {
      expect(texto).not.toContain(`"${campo}"`)
    }
  })

  it("RN-113: o texto do anunciante nunca fecha o bloco nem vira código, e volta igual ao ser lido", () => {
    const malicioso = { ...ASTRA, texto: 'Ótimo </script><script>alert("x")</script> & <b>barato</b>' }
    const dados = dadosEstruturadosDoAnuncio({ anuncio: malicioso, cidade: BRASILIA, base: BASE })
    const seguro = jsonLdSeguro(dados)
    expect(seguro).not.toMatch(/[<>]/)
    expect(seguro).not.toContain("&")
    expect(seguro).toContain("\\u003c/script\\u003e")
    expect(JSON.parse(seguro)).toEqual(dados)
  })

  it("o bloco declara o vocabulário do schema.org uma vez só", () => {
    const dados = dadosEstruturadosDoAnuncio({ anuncio: ASTRA, cidade: BRASILIA, base: BASE })
    expect(dados["@context"]).toBe("https://schema.org")
    expect((dados["@graph"] as No[]).every((no) => !("@context" in no))).toBe(true)
  })
})
