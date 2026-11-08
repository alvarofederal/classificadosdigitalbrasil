// DOMÍNIO — as 27 unidades da federação. O município vem do catálogo do IBGE (porta Localidades).

export const UFS = {
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapá",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Pará",
  PB: "Paraíba",
  PR: "Paraná",
  PE: "Pernambuco",
  PI: "Piauí",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondônia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "São Paulo",
  SE: "Sergipe",
  TO: "Tocantins",
} as const

export type UF = keyof typeof UFS

export const SIGLAS_UF = (Object.keys(UFS) as UF[]).sort()

export function ehUF(valor: string): valor is UF {
  return Object.prototype.hasOwnProperty.call(UFS, valor)
}

/** "df" (endereço) ou "DF" (formulário) → "DF"; qualquer outra coisa → null. */
export function ufDe(valor: string | null | undefined): UF | null {
  const sigla = (valor ?? "").trim().toUpperCase()
  return ehUF(sigla) ? sigla : null
}

export interface Cidade {
  codigo: number
  nome: string
  slug: string
  uf: UF
}
