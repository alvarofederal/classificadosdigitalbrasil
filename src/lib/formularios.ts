// APRESENTAÇÃO — leitura de FormData com Zod (formato) antes do caso de uso (regras).

import { z } from "zod"
import { type Centavos, centavosDeTextoEmReais } from "@/domain/shared/dinheiro"
import type { Result } from "@/domain/shared/result"

/** O que toda Server Action de formulário devolve para a tela. */
export type EstadoFormulario = {
  ok: boolean
  mensagem?: string
  codigo?: string
  campos?: Record<string, string>
} | null

export function deResultado(resultado: Result<unknown>, mensagemDeSucesso?: string): NonNullable<EstadoFormulario> {
  return resultado.ok
    ? { ok: true, mensagem: mensagemDeSucesso }
    : { ok: false, mensagem: resultado.mensagem, codigo: resultado.codigo, campos: resultado.campos }
}

export function lerFormulario<T extends z.ZodTypeAny>(
  schema: T,
  formData: FormData,
): { ok: true; dados: z.infer<T> } | { ok: false; estado: NonNullable<EstadoFormulario> } {
  const bruto: Record<string, unknown> = {}
  for (const chave of new Set(formData.keys())) {
    const valor = formData.get(chave)
    if (typeof valor === "string") bruto[chave] = valor
  }
  const resultado = schema.safeParse(bruto)
  if (resultado.success) return { ok: true, dados: resultado.data }

  const campos: Record<string, string> = {}
  for (const issue of resultado.error.issues) {
    const campo = String(issue.path[0] ?? "formulario")
    campos[campo] ??= issue.message
  }
  return { ok: false, estado: { ok: false, mensagem: "Revise os campos destacados.", codigo: "DADOS_INVALIDOS", campos } }
}

// ── Blocos de schema reaproveitados ──

export const texto = z.string().default("")

export const id = z.string().trim().min(1, "Obrigatório.").max(64).regex(/^[A-Za-z0-9_-]+$/, "Identificador inválido.")

export const checkbox = z
  .string()
  .optional()
  .transform((v) => v === "on" || v === "true" || v === "1")

export function inteiro(mensagem: string) {
  return z.string().trim().regex(/^\d+$/, mensagem).transform(Number)
}

/** Campo vazio vira 0, para o domínio responder com a mensagem certa ("Escolha a cidade."). */
export const codigoIbge = z
  .string()
  .optional()
  .transform((v) => (/^\d{7}$/.test((v ?? "").trim()) ? Number(v) : 0))

export function reaisOpcional(mensagem = "Valor inválido. Ex.: 22.000,00") {
  return z
    .string()
    .optional()
    .transform((v, ctx): Centavos | null => {
      const limpo = (v ?? "").trim()
      if (!limpo) return null
      const valor = centavosDeTextoEmReais(limpo)
      if (valor === null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: mensagem })
        return z.NEVER
      }
      return valor
    })
}

export function reais(mensagem: string) {
  return z
    .string()
    .trim()
    .min(1, mensagem)
    .transform((v, ctx): Centavos => {
      const valor = centavosDeTextoEmReais(v)
      if (valor === null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: mensagem })
        return z.NEVER
      }
      return valor
    })
}

export function umDe<T extends string>(catalogo: Record<T, string>, mensagem: string) {
  return z.string().refine((v): v is T => Object.prototype.hasOwnProperty.call(catalogo, v), mensagem) as unknown as z.ZodType<T, z.ZodTypeDef, string>
}

/** ?pagina=3 → 3 (mínimo 1). */
export function paginaDe(valor: string | string[] | undefined): number {
  const n = Number(Array.isArray(valor) ? valor[0] : valor)
  return Number.isInteger(n) && n > 0 ? n : 1
}

export function parametro(valor: string | string[] | undefined): string | null {
  const v = (Array.isArray(valor) ? valor[0] : valor)?.trim()
  return v ? v : null
}
