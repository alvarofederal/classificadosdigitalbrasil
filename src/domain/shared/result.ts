// DOMÍNIO — regras puras, sem framework.
// Erros de negócio são valores (Art. 3.6): todo caso de uso devolve um Result.
// Os objetos são planos e serializáveis, para atravessarem a fronteira das Server Actions.

export type ErrosDeCampo = Record<string, string>

export interface Sucesso<T> {
  readonly ok: true
  readonly valor: T
}

export interface Falha {
  readonly ok: false
  readonly codigo: string
  readonly mensagem: string
  readonly campos?: ErrosDeCampo
}

export type Result<T> = Sucesso<T> | Falha

export function ok<T>(valor: T): Sucesso<T> {
  return { ok: true, valor }
}

export function falha(codigo: string, mensagem: string, campos?: ErrosDeCampo): Falha {
  return campos && Object.keys(campos).length > 0
    ? { ok: false, codigo, mensagem, campos }
    : { ok: false, codigo, mensagem }
}

export function falhaDeValidacao(campos: ErrosDeCampo): Falha {
  return falha("DADOS_INVALIDOS", "Revise os campos destacados.", campos)
}
