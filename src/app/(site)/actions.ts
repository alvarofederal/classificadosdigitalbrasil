"use server"

// APRESENTAÇÃO — ação pública: mensagem de quem viu o anúncio (RF-17).

import { z } from "zod"
import { container } from "@/infrastructure/container"
import { type EstadoFormulario, deResultado, lerFormulario } from "@/lib/formularios"

const schemaMensagem = z.object({
  nome: z.string().default(""),
  contato: z.string().default(""),
  texto: z.string().default(""),
  site: z.string().optional(),
})

export async function enviarMensagemAction(anuncioId: string, formData: FormData): Promise<EstadoFormulario> {
  const lido = lerFormulario(schemaMensagem, formData)
  if (!lido.ok) return lido.estado
  // Campo-isca preenchido: finge sucesso e não grava nada.
  if (lido.dados.site) return { ok: true }
  const resultado = await container().enviarMensagem.executar(anuncioId, lido.dados)
  return deResultado(resultado, "Mensagem enviada.")
}
