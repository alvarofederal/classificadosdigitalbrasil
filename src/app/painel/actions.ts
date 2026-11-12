"use server"

// APRESENTAÇÃO — ações do administrador (RF-30 a RF-35, RF-51, RF-63, RF-84, RF-93, RF-103).

import { revalidatePath } from "next/cache"
import { z } from "zod"
import type { NovaFoto } from "@/application/ports/caderno"
import { ALINHAMENTOS, ESTILOS_DE_TITULO, MOLDURAS } from "@/domain/anuncio/anuncio"
import type { Precos } from "@/domain/plano/plano"
import { container } from "@/infrastructure/container"
import { type EstadoFormulario, checkbox, codigoIbge, deResultado, inteiro, lerFormulario, reais, reaisOpcional, texto, umDe } from "@/lib/formularios"
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

/** Feature 014 (RF-141): o admin desativa e ativa como o dono. */
export async function desativarAnuncioAdminAction(anuncioId: string): Promise<EstadoFormulario> {
  const admin = await autorizar("ADMIN")
  if (!admin) return NAO_AUTORIZADO
  const resultado = await container().ativarOuDesativar.desativar({ usuarioId: admin.id, perfil: "ADMIN" }, anuncioId)
  if (resultado.ok) revalidatePath("/painel", "layout")
  return deResultado(resultado, "Anúncio desativado. Ele saiu do caderno.")
}

export async function ativarAnuncioAdminAction(anuncioId: string): Promise<EstadoFormulario> {
  const admin = await autorizar("ADMIN")
  if (!admin) return NAO_AUTORIZADO
  const resultado = await container().ativarOuDesativar.ativar({ usuarioId: admin.id, perfil: "ADMIN" }, anuncioId)
  if (resultado.ok) revalidatePath("/painel", "layout")
  return deResultado(resultado, "Anúncio ativado. Ele voltou ao caderno.")
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

const schemaConfiguracao = z.object({ pixChave: texto, pixNome: texto, pixCidade: texto })

export async function salvarConfiguracaoAction(formData: FormData): Promise<EstadoFormulario> {
  const admin = await autorizar("ADMIN")
  if (!admin) return NAO_AUTORIZADO
  const lido = lerFormulario(schemaConfiguracao, formData)
  if (!lido.ok) return lido.estado
  const resultado = await container().atualizarConfiguracao.executar(lido.dados)
  return deResultado(resultado, "Configuração salva.")
}

// ── Planos (feature 003: RF-51) ──

const VALOR_INVALIDO = "Valor inválido. Ex.: 9,50"
const schemaPlano = z.object({
  nome: texto,
  descricao: texto,
  maxFotos: inteiro("Entre 0 e 6 fotos."),
  // Feature 009: um campo por período; em branco = período fora de venda.
  preco7: reaisOpcional(VALOR_INVALIDO),
  preco10: reaisOpcional(VALOR_INVALIDO),
  preco15: reaisOpcional(VALOR_INVALIDO),
  preco20: reaisOpcional(VALOR_INVALIDO),
  preco30: reaisOpcional(VALOR_INVALIDO),
  ativo: checkbox,
})

export async function salvarPlanoAction(codigo: string, formData: FormData): Promise<EstadoFormulario> {
  const admin = await autorizar("ADMIN")
  if (!admin) return NAO_AUTORIZADO
  const lido = lerFormulario(schemaPlano, formData)
  if (!lido.ok) return lido.estado
  const { preco7, preco10, preco15, preco20, preco30, ...resto } = lido.dados
  const precos: Precos = {}
  for (const [dias, valor] of [[7, preco7], [10, preco10], [15, preco15], [20, preco20], [30, preco30]] as const) {
    if (valor !== null) precos[dias] = valor
  }
  const resultado = await container().atualizarPlano.executar(codigo, { ...resto, precos })
  if (resultado.ok) revalidatePath("/", "layout")
  return deResultado(resultado, "Plano salvo. Vale para as próximas cobranças.")
}

// ── Chamados (feature 004: RF-63) ──

export async function atualizarChamadoAction(id: string, resolvido: boolean, formData: FormData): Promise<EstadoFormulario> {
  const admin = await autorizar("ADMIN")
  if (!admin) return NAO_AUTORIZADO
  const nota = formData.get("notaInterna")
  const resultado = await container().atualizarChamado.executar(id, { resolvido, notaInterna: typeof nota === "string" ? nota : null })
  if (resultado.ok) revalidatePath("/painel", "layout")
  return deResultado(resultado, resolvido ? "Chamado resolvido." : "Chamado reaberto.")
}

// ── Anúncio pelo admin (feature 007: RF-84, RF-93) ──

const schemaCortesia = z.object({ planoCodigo: texto, dias: inteiro("Informe os dias.") })

export async function publicarCortesiaAction(anuncioId: string, formData: FormData): Promise<EstadoFormulario> {
  const admin = await autorizar("ADMIN")
  if (!admin) return NAO_AUTORIZADO
  const lido = lerFormulario(schemaCortesia, formData)
  if (!lido.ok) return lido.estado
  const resultado = await container().publicarCortesia.executar({ adminId: admin.id, anuncioId, ...lido.dados })
  if (resultado.ok) revalidatePath("/", "layout")
  return deResultado(resultado, "Anúncio publicado como cortesia.")
}

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

export async function editarAnuncioAdminAction(anuncioId: string, formData: FormData): Promise<EstadoFormulario> {
  const admin = await autorizar("ADMIN")
  if (!admin) return NAO_AUTORIZADO
  const lido = lerFormulario(schemaAnuncio, formData)
  if (!lido.ok) return lido.estado
  const d = lido.dados
  const resultado = await container().editarAnuncio.executar({ usuarioId: admin.id, perfil: "ADMIN" }, anuncioId, {
    categoriaId: d.categoriaId,
    uf: d.uf,
    cidadeCodigo: d.cidadeCodigo,
    titulo: d.titulo,
    texto: d.texto,
    precoCentavos: d.preco,
    estilo: { moldura: d.moldura, estiloTitulo: d.estiloTitulo, alinhamento: d.alinhamento, estrelas: d.estrelas },
  })
  if (resultado.ok) revalidatePath("/", "layout")
  return deResultado(resultado, "Anúncio salvo.")
}

const ADMIN = (id: string) => ({ usuarioId: id, perfil: "ADMIN" as const })

export async function prepararUploadAdminAction(anuncioId: string, quantidade: number) {
  const admin = await autorizar("ADMIN")
  if (!admin) return NAO_AUTORIZADO
  try {
    const r = await container().prepararUpload.executar(ADMIN(admin.id), { anuncioId, quantidade })
    return r.ok ? { ok: true as const, assinaturas: r.valor.assinaturas } : { ok: false as const, mensagem: r.mensagem }
  } catch (erro) {
    console.error("[fotos admin] preparo do upload", erro)
    return { ok: false as const, mensagem: "O envio de fotos está indisponível no momento." }
  }
}

const schemaFotos = z.array(z.object({ url: z.string().url().max(500), publicId: z.string().min(1).max(255) })).max(6)

export async function adicionarFotosAdminAction(anuncioId: string, fotos: NovaFoto[]): Promise<EstadoFormulario> {
  const admin = await autorizar("ADMIN")
  if (!admin) return NAO_AUTORIZADO
  const lidas = schemaFotos.safeParse(fotos)
  if (!lidas.success) return { ok: false, mensagem: "Fotos inválidas." }
  const r = await container().adicionarFotos.executar(ADMIN(admin.id), { anuncioId, fotos: lidas.data })
  if (r.ok) revalidatePath("/", "layout")
  return deResultado(r)
}

export async function reordenarFotosAdminAction(anuncioId: string, ids: string[]): Promise<EstadoFormulario> {
  const admin = await autorizar("ADMIN")
  if (!admin) return NAO_AUTORIZADO
  const r = await container().reordenarFotos.executar(ADMIN(admin.id), { anuncioId, ids: ids.slice(0, 6).map(String) })
  if (r.ok) revalidatePath("/", "layout")
  return deResultado(r)
}

export async function removerFotoAdminAction(anuncioId: string, fotoId: string): Promise<EstadoFormulario> {
  const admin = await autorizar("ADMIN")
  if (!admin) return NAO_AUTORIZADO
  const r = await container().removerFoto.executar(ADMIN(admin.id), { anuncioId, fotoId })
  if (r.ok) revalidatePath("/", "layout")
  return deResultado(r)
}

/** RF-103: manda um e-mail de teste para o próprio administrador e mostra o que o servidor respondeu. */
export async function enviarEmailDeTesteAction(): Promise<EstadoFormulario> {
  const admin = await autorizar("ADMIN")
  if (!admin) return NAO_AUTORIZADO
  const resultado = await container().enviarEmailDeTeste.executar({ nome: admin.nome, email: admin.email })
  return deResultado(resultado, `E-mail de teste enviado para ${admin.email}. Confira a caixa de entrada e o spam.`)
}
