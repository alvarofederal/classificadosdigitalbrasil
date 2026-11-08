// DOMÍNIO — dinheiro sempre em centavos inteiros (ADR-07). Nunca float.

export type Centavos = number

export function ehCentavosValido(valor: unknown): valor is Centavos {
  return typeof valor === "number" && Number.isSafeInteger(valor) && valor >= 0
}

/** "89.900,10", "89900,1", "R$ 89.900", "89900" → 8990010. Devolve null se não for um valor em reais. */
export function centavosDeTextoEmReais(texto: string): Centavos | null {
  const limpo = texto.replace(/R\$|\s/g, "")
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(limpo)) return null
  const [inteiros, decimais = ""] = limpo.replace(/\./g, "").split(",")
  return Number(inteiros) * 100 + Number(decimais.padEnd(2, "0"))
}

/** Valor decimal com 2 casas, no formato que o banco espera ("89900.10"). */
export function centavosParaDecimal(valor: Centavos): string {
  const sinal = valor < 0 ? "-" : ""
  const absoluto = Math.abs(valor)
  return `${sinal}${Math.floor(absoluto / 100)}.${String(absoluto % 100).padStart(2, "0")}`
}

/** Converte o texto decimal vindo do banco ("89900.10") para centavos, sem passar por float. */
export function centavosDeDecimal(decimal: string): Centavos {
  const negativo = decimal.startsWith("-")
  const [inteiros, decimais = ""] = decimal.replace("-", "").split(".")
  const valor = Number(inteiros) * 100 + Number(decimais.padEnd(2, "0").slice(0, 2))
  return negativo ? -valor : valor
}

const REAIS_COM_CENTAVOS = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
const REAIS_INTEIROS = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })

/** R$ 89.900,00 (ou R$ 89.900 com `semCentavos`). Espaço comum no lugar do não separável, para texto de mensagem. */
export function formatarReais(valor: Centavos, { semCentavos = false } = {}): string {
  const formato = semCentavos ? REAIS_INTEIROS : REAIS_COM_CENTAVOS
  return formato.format(valor / 100).replace(/ /g, " ")
}
