"use server"

// APRESENTAÇÃO — ações do administrador (RF-30 a RF-35).

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { container } from "@/infrastructure/container"
import { type EstadoFormulario, checkbox, deResultado, inteiro, lerFormulario, reais, texto } from "@/lib/formularios"
import { NAO_AUTORIZADO, autorizar } from "@/lib/sessao"

export async function confirmarPagamentoAction(pagamentoId: string): Promise<EstadoFormulario> {
  const admin = await autorizar("ADMIN")
  if (!admin) return NAO_AUTORIZADO
  try {
    const resultado = await container().confirmarPagamento.executar({ pagamentoId, adminId: admin.id })
    if (resultado.ok) revalidatePath("/painel", "layout")
    return deResultado(resultado, "Pagamento confirmado. O anúncio está no caderno.")
  } catch {
    return { ok: false, mensagem: "Este pagamento já foi processado." }
  }
}

export async function removerAnuncioAdminAction(anuncioId: string): Promise<EstadoFormulario> {
  const admin = await autorizar("ADMIN")
  if (!admin) return NAO_AUTORIZADO
  const resultado = await container().removerAnuncio.executar({ usuarioId: admin.id, perfil: "ADMIN" }, anuncioId)
  if (resultado.ok) revalidatePath("/painel", "layout")
  return deResultado(resultado, "Anúncio removido do caderno.")
}

export async function restaurarAnuncioAction(anuncioId: string): Promise<EstadoFormulario> {
  const admin = await autorizar("ADMIN")
  if (!admin) return NAO_AUTORIZADO
  const resultado = await container().restaurarAnuncio.executar({ usuarioId: admin.id, perfil: "ADMIN" }, anuncioId)
  if (resultado.ok) revalidatePath("/painel", "layout")
  return deResultado(resultado, "Anúncio restaurado.")
}

const schemaCategoria = z.object({
  nome: texto,
  ordem: inteiro("Ordem entre 0 e 999."),
  ativa: checkbox,
})

export async function criarCategoriaAction(formData: FormData): Promise<EstadoFormulario> {
  const admin = await autorizar("ADMIN")
  if (!admin) return NAO_AUTORIZADO
  const lido = lerFormulario(schemaCategoria, formData)
  if (!lido.ok) return lido.estado
  const resultado = await container().criarCategoria.executar(lido.dados)
  if (resultado.ok) revalidatePath("/painel/categorias")
  return deResultado(resultado, "Categoria criada.")
}

export async function atualizarCategoriaAction(id: string, formData: FormData): Promise<EstadoFormulario> {
  const admin = await autorizar("ADMIN")
  if (!admin) return NAO_AUTORIZADO
  const lido = lerFormulario(schemaCategoria, formData)
  if (!lido.ok) return lido.estado
  const resultado = await container().atualizarCategoria.executar(id, lido.dados)
  if (resultado.ok) revalidatePath("/painel/categorias")
  return deResultado(resultado, "Categoria salva.")
}

export async function removerCategoriaAction(id: string): Promise<EstadoFormulario> {
  const admin = await autorizar("ADMIN")
  if (!admin) return NAO_AUTORIZADO
  const resultado = await container().removerCategoria.executar(id)
  if (resultado.ok) revalidatePath("/painel/categorias")
  return deResultado(resultado, "Categoria excluída.")
}

const schemaConfiguracao = z.object({
  pixChave: texto,
  pixNome: texto,
  pixCidade: texto,
  valorAnuncio: reais("Informe o valor. Ex.: 1,00"),
  diasDePublicacao: inteiro("Informe os dias."),
})

export async function salvarConfiguracaoAction(formData: FormData): Promise<EstadoFormulario> {
  const admin = await autorizar("ADMIN")
  if (!admin) return NAO_AUTORIZADO
  const lido = lerFormulario(schemaConfiguracao, formData)
  if (!lido.ok) return lido.estado
  const { valorAnuncio, ...resto } = lido.dados
  const resultado = await container().atualizarConfiguracao.executar({ ...resto, valorAnuncioCentavos: valorAnuncio })
  if (resultado.ok) revalidatePath("/", "layout")
  return deResultado(resultado, "Configuração salva.")
}
