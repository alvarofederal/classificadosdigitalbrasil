"use server"

// APRESENTAÇÃO — ações públicas: mensagem ao anunciante (RF-17), contato com o admin (RF-60) e "perto de mim" (RF-41).

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

const schemaChamado = z.object({
  nome: z.string().default(""),
  email: z.string().default(""),
  telefone: z.string().default(""),
  assunto: z.string().default(""),
  mensagem: z.string().default(""),
  anuncioCodigo: z.string().default(""),
  site: z.string().optional(),
})

export async function abrirChamadoAction(formData: FormData): Promise<EstadoFormulario & { protocolo?: string }> {
  const lido = lerFormulario(schemaChamado, formData)
  if (!lido.ok) return lido.estado
  if (lido.dados.site) return { ok: true, protocolo: "--------" }
  const { site: _site, ...dados } = lido.dados
  const resultado = await container().abrirChamado.executar({ ...dados, anuncioCodigo: dados.anuncioCodigo || null })
  return resultado.ok ? { ok: true, protocolo: resultado.valor.protocolo } : deResultado(resultado)
}

/** RN-40: a coordenada só é usada aqui para achar a cidade; não é gravada nem registrada. */
export async function localizarCidadeAction(latitude: number, longitude: number): Promise<{ ok: true; uf: string; slug: string; nome: string } | { ok: false; mensagem: string }> {
  const lat = Number(latitude)
  const lng = Number(longitude)
  const resultado = container().localizarCidade.executar({ latitude: lat, longitude: lng })
  if (!resultado.ok) return { ok: false, mensagem: resultado.mensagem }
  return { ok: true, uf: resultado.valor.uf, slug: resultado.valor.slug, nome: resultado.valor.nome }
}
