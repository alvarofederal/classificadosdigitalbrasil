"use server"

// APRESENTAÇÃO — ações do anunciante: adaptadores finos (formato → caso de uso → revalidação).

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import type { NovaFoto } from "@/application/ports/caderno"
import { ALINHAMENTOS, type ConteudoDoAnuncio, ESTILOS_DE_TITULO, MOLDURAS } from "@/domain/anuncio/anuncio"
import { container } from "@/infrastructure/container"
import { type EstadoFormulario, checkbox, codigoIbge, deResultado, lerFormulario, reaisOpcional, texto, umDe } from "@/lib/formularios"
import { NAO_AUTORIZADO, autorizar } from "@/lib/sessao"

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

function conteudoDe(dados: z.infer<typeof schemaAnuncio>): ConteudoDoAnuncio {
  return {
    categoriaId: dados.categoriaId,
    uf: dados.uf,
    cidadeCodigo: dados.cidadeCodigo,
    titulo: dados.titulo,
    texto: dados.texto,
    precoCentavos: dados.preco,
    estilo: { moldura: dados.moldura, estiloTitulo: dados.estiloTitulo, alinhamento: dados.alinhamento, estrelas: dados.estrelas },
  }
}

function ator(usuario: { id: string; perfil: "ANUNCIANTE" | "ADMIN" }) {
  return { usuarioId: usuario.id, perfil: usuario.perfil }
}

export async function criarAnuncioAction(formData: FormData): Promise<EstadoFormulario> {
  const usuario = await autorizar("ANUNCIANTE")
  if (!usuario) return NAO_AUTORIZADO
  const lido = lerFormulario(schemaAnuncio, formData)
  if (!lido.ok) return lido.estado
  const resultado = await container().criarAnuncio.executar(usuario.id, conteudoDe(lido.dados))
  if (!resultado.ok) return deResultado(resultado)
  revalidatePath("/minha-conta")
  redirect(`/minha-conta/anuncios/${resultado.valor.anuncioId}?novo=1`)
}

export async function editarAnuncioAction(anuncioId: string, formData: FormData): Promise<EstadoFormulario> {
  const usuario = await autorizar("ANUNCIANTE")
  if (!usuario) return NAO_AUTORIZADO
  const lido = lerFormulario(schemaAnuncio, formData)
  if (!lido.ok) return lido.estado
  const resultado = await container().editarAnuncio.executar(ator(usuario), anuncioId, conteudoDe(lido.dados))
  if (resultado.ok) revalidatePath(`/minha-conta/anuncios/${anuncioId}`)
  return deResultado(resultado, "Anúncio salvo.")
}

export async function removerAnuncioAction(anuncioId: string): Promise<EstadoFormulario> {
  const usuario = await autorizar("ANUNCIANTE")
  if (!usuario) return NAO_AUTORIZADO
  const resultado = await container().removerAnuncio.executar(ator(usuario), anuncioId)
  if (!resultado.ok) return deResultado(resultado)
  revalidatePath("/minha-conta")
  redirect("/minha-conta?removido=1")
}

export async function renovarAnuncioAction(anuncioId: string): Promise<EstadoFormulario> {
  const usuario = await autorizar("ANUNCIANTE")
  if (!usuario) return NAO_AUTORIZADO
  const resultado = await container().solicitarRenovacao.executar({ usuarioId: usuario.id, anuncioId })
  if (resultado.ok) revalidatePath(`/minha-conta/anuncios/${anuncioId}`)
  return deResultado(resultado, "Cobrança gerada. Pague o Pix abaixo.")
}

// ── Álbum (ADR-05) ──

export async function prepararUploadAction(anuncioId: string, quantidade: number) {
  const usuario = await autorizar("ANUNCIANTE")
  if (!usuario) return NAO_AUTORIZADO
  try {
    const resultado = await container().prepararUpload.executar(ator(usuario), { anuncioId, quantidade })
    return resultado.ok ? { ok: true as const, assinaturas: resultado.valor.assinaturas } : { ok: false as const, mensagem: resultado.mensagem }
  } catch (erro) {
    console.error("[fotos] preparo do upload", erro)
    return { ok: false as const, mensagem: "O envio de fotos está indisponível no momento." }
  }
}

const schemaFotos = z.array(z.object({ url: z.string().url().max(500), publicId: z.string().min(1).max(255) })).max(6)

export async function adicionarFotosAction(anuncioId: string, fotos: NovaFoto[]): Promise<EstadoFormulario> {
  const usuario = await autorizar("ANUNCIANTE")
  if (!usuario) return NAO_AUTORIZADO
  const lidas = schemaFotos.safeParse(fotos)
  if (!lidas.success) return { ok: false, mensagem: "Fotos inválidas." }
  const resultado = await container().adicionarFotos.executar(ator(usuario), { anuncioId, fotos: lidas.data })
  if (resultado.ok) revalidatePath(`/minha-conta/anuncios/${anuncioId}`)
  return deResultado(resultado)
}

export async function reordenarFotosAction(anuncioId: string, ids: string[]): Promise<EstadoFormulario> {
  const usuario = await autorizar("ANUNCIANTE")
  if (!usuario) return NAO_AUTORIZADO
  const resultado = await container().reordenarFotos.executar(ator(usuario), { anuncioId, ids: ids.slice(0, 6).map(String) })
  return deResultado(resultado)
}

export async function removerFotoAction(anuncioId: string, fotoId: string): Promise<EstadoFormulario> {
  const usuario = await autorizar("ANUNCIANTE")
  if (!usuario) return NAO_AUTORIZADO
  const resultado = await container().removerFoto.executar(ator(usuario), { anuncioId, fotoId })
  if (resultado.ok) revalidatePath(`/minha-conta/anuncios/${anuncioId}`)
  return deResultado(resultado)
}

// ── Perfil ──

const schemaPerfil = z.object({ nome: texto, email: texto, celular: texto, uf: texto, cidadeCodigo: codigoIbge })

export async function atualizarPerfilAction(formData: FormData): Promise<EstadoFormulario> {
  const usuario = await autorizar("ANUNCIANTE")
  if (!usuario) return NAO_AUTORIZADO
  const lido = lerFormulario(schemaPerfil, formData)
  if (!lido.ok) return lido.estado
  const resultado = await container().atualizarPerfil.executar(usuario.id, lido.dados)
  if (resultado.ok) revalidatePath("/minha-conta/perfil")
  return deResultado(resultado, "Dados atualizados.")
}
