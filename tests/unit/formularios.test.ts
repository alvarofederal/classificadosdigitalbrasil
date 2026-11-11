// Leitura de formulários com Zod: o formato é conferido na Server Action, antes do caso de uso (Art. 4.2).
// Estes testes fixam o comportamento dos blocos de `src/lib/formularios.ts` e dos formatos usados nas ações.
// Foram escritos com o Zod 3 e precisam passar iguais com o Zod 4 (atualização de segurança de 2026-11-10).
import { describe, expect, it } from "vitest"
import { z } from "zod"
import { ALINHAMENTOS, ESTILOS_DE_TITULO, MOLDURAS } from "@/domain/anuncio/anuncio"
import { checkbox, codigoIbge, id, inteiro, lerFormulario, paginaDe, parametro, reais, reaisOpcional, texto, umDe } from "@/lib/formularios"

function formulario(campos: Record<string, string | Blob>): FormData {
  const dados = new FormData()
  for (const [chave, valor] of Object.entries(campos)) dados.set(chave, valor)
  return dados
}

/** Lê e devolve os dados; falha o teste se o formulário for recusado. */
function ler<T extends z.ZodTypeAny>(schema: T, campos: Record<string, string | Blob>): z.infer<T> {
  const lido = lerFormulario(schema, formulario(campos))
  if (!lido.ok) throw new Error(`formulário recusado: ${JSON.stringify(lido.estado.campos)}`)
  return lido.dados
}

/** Lê e devolve os erros por campo; falha o teste se o formulário for aceito. */
function erros<T extends z.ZodTypeAny>(schema: T, campos: Record<string, string | Blob>): Record<string, string> {
  const lido = lerFormulario(schema, formulario(campos))
  if (lido.ok) throw new Error(`formulário aceito: ${JSON.stringify(lido.dados)}`)
  expect(lido.estado).toMatchObject({ ok: false, codigo: "DADOS_INVALIDOS", mensagem: "Revise os campos destacados." })
  return lido.estado.campos ?? {}
}

// Os mesmos formatos das ações (os de lá não são exportados).
const schemaEntrar = z.object({
  email: z.string().trim().min(1, "Informe o e-mail.").max(160),
  senha: z.string().min(1, "Informe a senha.").max(200),
  voltar: z.string().optional(),
})
const schemaAnuncio = z.object({
  categoriaId: texto,
  uf: texto,
  cidadeCodigo: codigoIbge,
  titulo: texto,
  texto: texto,
  preco: reaisOpcional(),
  moldura: umDe(MOLDURAS, "Escolha a moldura."),
  estiloTitulo: umDe(ESTILOS_DE_TITULO, "Escolha o estilo do título."),
  alinhamento: umDe(ALINHAMENTOS, "Escolha o alinhamento."),
  estrelas: checkbox,
})
const schemaPlanoDoAnuncio = z.object({
  planoCodigo: texto,
  dias: z
    .string()
    .optional()
    .transform((v) => Number(v ?? 0)),
})
const schemaFotos = z.array(z.object({ url: z.string().url().max(500), publicId: z.string().min(1).max(255) })).max(6)

const anuncioValido = {
  categoriaId: "cat-veiculos",
  uf: "DF",
  cidadeCodigo: "5300108",
  titulo: "Vendo Gol 2010",
  texto: "Completo, revisado.",
  preco: "22.000,00",
  moldura: "SIMPLES",
  estiloTitulo: Object.keys(ESTILOS_DE_TITULO)[0],
  alinhamento: Object.keys(ALINHAMENTOS)[0],
  estrelas: "on",
}

describe("lerFormulario", () => {
  it("entrega os dados quando o formato confere", () => {
    expect(ler(schemaEntrar, { email: "  dono@exemplo.com ", senha: " segredo " })).toEqual({ email: "dono@exemplo.com", senha: " segredo " })
    expect(ler(schemaEntrar, { email: "a@b.com", senha: "x", voltar: "/minha-conta" }).voltar).toBe("/minha-conta")
  })

  it("devolve a mensagem de cada campo recusado, e só a primeira de cada um", () => {
    expect(erros(schemaEntrar, { email: "   ", senha: "" })).toEqual({ email: "Informe o e-mail.", senha: "Informe a senha." })
    expect(erros(z.object({ codigo: id }), { codigo: "" })).toEqual({ codigo: "Obrigatório." })
  })

  it("campo comprido demais ou ausente é recusado no campo certo", () => {
    expect(Object.keys(erros(schemaEntrar, { email: `${"a".repeat(161)}`, senha: "x" }))).toEqual(["email"])
    expect(Object.keys(erros(schemaEntrar, { senha: "x" }))).toEqual(["email"])
  })

  it("ignora o que não é texto (arquivo enviado num campo)", () => {
    expect(ler(z.object({ nome: texto }), { nome: new Blob(["x"]) })).toEqual({ nome: "" })
  })
})

describe("Blocos de formato", () => {
  it("texto: campo ausente vira vazio e o que foi digitado fica como veio", () => {
    expect(ler(z.object({ nome: texto }), {})).toEqual({ nome: "" })
    expect(ler(z.object({ nome: texto }), { nome: "  Ana  " })).toEqual({ nome: "  Ana  " })
  })

  it("id: tira espaços das pontas e só aceita letras, números, hífen e sublinhado", () => {
    expect(ler(z.object({ x: id }), { x: " abc_123-X " })).toEqual({ x: "abc_123-X" })
    expect(erros(z.object({ x: id }), { x: "a b" })).toEqual({ x: "Identificador inválido." })
    expect(erros(z.object({ x: id }), { x: "../etc" })).toEqual({ x: "Identificador inválido." })
    expect(Object.keys(erros(z.object({ x: id }), { x: "a".repeat(65) }))).toEqual(["x"])
  })

  it("checkbox: marcado só com on, true ou 1", () => {
    const schema = z.object({ ativa: checkbox })
    for (const marcado of ["on", "true", "1"]) expect(ler(schema, { ativa: marcado })).toEqual({ ativa: true })
    for (const desmarcado of ["", "off", "0", "sim"]) expect(ler(schema, { ativa: desmarcado })).toEqual({ ativa: false })
    expect(ler(schema, {})).toEqual({ ativa: false })
  })

  it("inteiro: só dígitos, com a mensagem informada", () => {
    const schema = z.object({ ordem: inteiro("Ordem entre 0 e 999.") })
    expect(ler(schema, { ordem: "12" })).toEqual({ ordem: 12 })
    expect(ler(schema, { ordem: " 7 " })).toEqual({ ordem: 7 })
    for (const ruim of ["", "abc", "-1", "1.5", "1e3"]) expect(erros(schema, { ordem: ruim })).toEqual({ ordem: "Ordem entre 0 e 999." })
    expect(Object.keys(erros(schema, {}))).toEqual(["ordem"])
  })

  it("codigoIbge: sete dígitos viram número; qualquer outra coisa vira 0, para o domínio responder", () => {
    const schema = z.object({ cidadeCodigo: codigoIbge })
    expect(ler(schema, { cidadeCodigo: "5300108" })).toEqual({ cidadeCodigo: 5300108 })
    expect(ler(schema, { cidadeCodigo: " 5300108 " })).toEqual({ cidadeCodigo: 5300108 })
    for (const ruim of ["", "530010", "53001080", "abc"]) expect(ler(schema, { cidadeCodigo: ruim })).toEqual({ cidadeCodigo: 0 })
    expect(ler(schema, {})).toEqual({ cidadeCodigo: 0 })
  })

  it("reaisOpcional: vazio é sem preço; valor em reais vira centavos; texto estranho é recusado", () => {
    const schema = z.object({ preco: reaisOpcional() })
    expect(ler(schema, {})).toEqual({ preco: null })
    expect(ler(schema, { preco: "   " })).toEqual({ preco: null })
    expect(ler(schema, { preco: "22.000,00" })).toEqual({ preco: 2_200_000 })
    expect(ler(schema, { preco: "9,50" })).toEqual({ preco: 950 })
    expect(erros(schema, { preco: "abc" })).toEqual({ preco: "Valor inválido. Ex.: 22.000,00" })
    expect(erros(z.object({ preco7: reaisOpcional("Valor inválido. Ex.: 9,50") }), { preco7: "x" })).toEqual({ preco7: "Valor inválido. Ex.: 9,50" })
  })

  it("reais: obrigatório, com a mensagem informada", () => {
    const schema = z.object({ valor: reais("Informe o valor.") })
    expect(ler(schema, { valor: "1,00" })).toEqual({ valor: 100 })
    expect(erros(schema, { valor: "" })).toEqual({ valor: "Informe o valor." })
    expect(erros(schema, { valor: "x" })).toEqual({ valor: "Informe o valor." })
  })

  it("umDe: só aceita uma chave do catálogo", () => {
    const schema = z.object({ moldura: umDe(MOLDURAS, "Escolha a moldura.") })
    for (const chave of Object.keys(MOLDURAS)) expect(ler(schema, { moldura: chave })).toEqual({ moldura: chave })
    expect(erros(schema, { moldura: "NEON" })).toEqual({ moldura: "Escolha a moldura." })
    expect(erros(schema, { moldura: "toString" })).toEqual({ moldura: "Escolha a moldura." })
    expect(Object.keys(erros(schema, {}))).toEqual(["moldura"])
  })

  it("paginaDe e parametro leem os parâmetros do endereço", () => {
    expect(paginaDe("3")).toBe(3)
    expect(paginaDe(["2", "9"])).toBe(2)
    for (const ruim of [undefined, "0", "-1", "abc", "1.5"]) expect(paginaDe(ruim)).toBe(1)
    expect(parametro("  DF ")).toBe("DF")
    expect(parametro(["a", "b"])).toBe("a")
    expect(parametro("   ")).toBeNull()
    expect(parametro(undefined)).toBeNull()
  })
})

describe("Formatos das ações", () => {
  it("anúncio com plano: junta os dois formatos e converte preço, cidade, estrelas e dias", () => {
    const dados = ler(schemaAnuncio.merge(schemaPlanoDoAnuncio), { ...anuncioValido, planoCodigo: "SIMPLES", dias: "7" })
    expect(dados).toEqual({
      ...anuncioValido,
      cidadeCodigo: 5300108,
      preco: 2_200_000,
      estrelas: true,
      planoCodigo: "SIMPLES",
      dias: 7,
    })
  })

  it("anúncio sem preço, sem estrelas e sem dias: nulo, falso e zero", () => {
    const { preco: _preco, estrelas: _estrelas, ...semOpcionais } = anuncioValido
    const dados = ler(schemaAnuncio.merge(schemaPlanoDoAnuncio), semOpcionais)
    expect(dados).toMatchObject({ preco: null, estrelas: false, planoCodigo: "", dias: 0 })
  })

  it("anúncio com moldura fora do catálogo e preço inválido: um erro por campo", () => {
    expect(erros(schemaAnuncio, { ...anuncioValido, moldura: "NEON", preco: "caro" })).toEqual({
      moldura: "Escolha a moldura.",
      preco: "Valor inválido. Ex.: 22.000,00",
    })
  })

  it("fotos: até 6, com endereço válido e identificador", () => {
    const foto = (n: number) => ({ url: `https://res.cloudinary.com/demo/image/upload/a${n}.jpg`, publicId: `pasta/a${n}` })
    const seis = Array.from({ length: 6 }, (_, i) => foto(i))
    expect(schemaFotos.safeParse(seis)).toMatchObject({ success: true, data: seis })
    expect(schemaFotos.safeParse([...seis, foto(7)]).success).toBe(false)
    expect(schemaFotos.safeParse([{ url: "não é endereço", publicId: "x" }]).success).toBe(false)
    expect(schemaFotos.safeParse([{ url: foto(1).url, publicId: "" }]).success).toBe(false)
    expect(schemaFotos.safeParse([{ url: foto(1).url }]).success).toBe(false)
    expect(schemaFotos.safeParse("texto").success).toBe(false)
    expect(schemaFotos.safeParse(null).success).toBe(false)
  })

  it("fotos: lista gigante é recusada pelo tamanho, sem validar item por item (GHSA-mrhx-c7xc-m3w5)", () => {
    // Antes do Zod 4.6.6 cada item inválido gerava seus avisos, e uma lista enorme podia esgotar a memória.
    const enorme = Array.from({ length: 50_000 }, () => ({ url: "x", publicId: "" }))
    const lidas = schemaFotos.safeParse(enorme)
    expect(lidas.success).toBe(false)
    if (!lidas.success) expect(lidas.error.issues).toHaveLength(1)
  })

  it("fotos: campo a mais é descartado, não passa adiante", () => {
    const lidas = schemaFotos.safeParse([{ url: "https://res.cloudinary.com/demo/image/upload/a.jpg", publicId: "pasta/a", admin: true }])
    expect(lidas.success && lidas.data).toEqual([{ url: "https://res.cloudinary.com/demo/image/upload/a.jpg", publicId: "pasta/a" }])
  })
})
