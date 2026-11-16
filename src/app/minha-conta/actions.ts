"use server"

// APRESENTAÇÃO — ações do anunciante: adaptadores finos (formato → caso de uso → revalidação).

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import type { NovaFoto } from "@/application/ports/caderno"
import { ALINHAMENTOS, type ConteudoDoAnuncio, ESTILOS_DE_TITULO, MOLDURAS } from "@/domain/anuncio/anuncio"
import { container } from "@/infrastructure/container"
import { formatarDia } from "@/lib/formatadores"
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

const schemaPlano = z.object({
  planoCodigo: texto,
  dias: z
    .string()
    .optional()
    .transform((v) => Number(v ?? 0)),
  // Feature 017 (RF-172, RF-173): Pix ou dias do banco; sem o campo, Pix, como antes.
  forma: z
    .string()
    .optional()
    .transform((v): "PIX" | "BANCO" => (v === "BANCO" ? "BANCO" : "PIX")),
})

export async function criarAnuncioAction(formData: FormData): Promise<EstadoFormulario> {
  const usuario = await autorizar("ANUNCIANTE")
  if (!usuario) return NAO_AUTORIZADO
  const lido = lerFormulario(schemaAnuncio.merge(schemaPlano), formData)
  if (!lido.ok) return lido.estado
  const resultado = await container().criarAnuncio.executar(
    { id: usuario.id, email: usuario.email },
    { ...conteudoDe(lido.dados), planoCodigo: lido.dados.planoCodigo, dias: lido.dados.dias, forma: lido.dados.forma },
  )
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

/** Feature 014 (RF-140): tira do caderno por um tempo; o prazo continua correndo (RN-141). */
export async function desativarAnuncioAction(anuncioId: string): Promise<EstadoFormulario> {
  const usuario = await autorizar("ANUNCIANTE")
  if (!usuario) return NAO_AUTORIZADO
  const resultado = await container().ativarOuDesativar.desativar(ator(usuario), anuncioId)
  if (resultado.ok) {
    revalidatePath("/minha-conta")
    revalidatePath(`/minha-conta/anuncios/${anuncioId}`)
  }
  return deResultado(resultado, "Anúncio desativado. Ele saiu do caderno.")
}

export async function ativarAnuncioAction(anuncioId: string): Promise<EstadoFormulario> {
  const usuario = await autorizar("ANUNCIANTE")
  if (!usuario) return NAO_AUTORIZADO
  const resultado = await container().ativarOuDesativar.ativar(ator(usuario), anuncioId)
  if (resultado.ok) {
    revalidatePath("/minha-conta")
    revalidatePath(`/minha-conta/anuncios/${anuncioId}`)
  }
  return deResultado(resultado, "Anúncio ativado. Ele voltou ao caderno.")
}

export async function renovarAnuncioAction(anuncioId: string, formData: FormData): Promise<EstadoFormulario> {
  const usuario = await autorizar("ANUNCIANTE")
  if (!usuario) return NAO_AUTORIZADO
  const lido = lerFormulario(schemaPlano, formData)
  if (!lido.ok) return lido.estado
  const { forma, planoCodigo, dias } = lido.dados
  if (forma === "BANCO") {
    // RF-173: renovar ou prolongar com os dias do banco, sem Pix.
    const usado = await container().usarDiasDoBanco.executar({ usuarioId: usuario.id, anuncioId, tipo: planoCodigo, dias })
    if (usado.ok) {
      revalidatePath("/minha-conta")
      revalidatePath(`/minha-conta/anuncios/${anuncioId}`)
    }
    return deResultado(usado, usado.ok ? `Dias do banco usados. O anúncio fica no caderno até ${formatarDia(usado.valor.expiraEm)}.` : undefined)
  }
  const resultado = await container().solicitarRenovacao.executar({ usuarioId: usuario.id, email: usuario.email, anuncioId, planoCodigo, dias })
  if (resultado.ok) revalidatePath(`/minha-conta/anuncios/${anuncioId}`)
  return deResultado(resultado, "Cobrança gerada. Pague o Pix abaixo.")
}

/** RF-82: a tela de pagamento pergunta a cada 5 s; com o gateway, a resposta vem da consulta ao Mercado Pago. */
export async function verificarPagamentoAction(anuncioId: string): Promise<{ pago: boolean }> {
  const usuario = await autorizar("ANUNCIANTE")
  if (!usuario) return { pago: false }
  try {
    const r = await container().verificarPagamento.executar({ usuarioId: usuario.id, anuncioId })
    if (r.pago) revalidatePath(`/minha-conta/anuncios/${anuncioId}`)
    return r
  } catch (erro) {
    console.error("[pagamento] falha ao verificar", erro)
    return { pago: false }
  }
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

// O e-mail não vem aqui: a troca passa pelo código (feature 016, RF-154).
const schemaPerfil = z.object({ nome: texto, celular: texto, uf: texto, cidadeCodigo: codigoIbge })

export async function atualizarPerfilAction(formData: FormData): Promise<EstadoFormulario> {
  const usuario = await autorizar("ANUNCIANTE")
  if (!usuario) return NAO_AUTORIZADO
  const lido = lerFormulario(schemaPerfil, formData)
  if (!lido.ok) return lido.estado
  const resultado = await container().atualizarPerfil.executar(usuario.id, lido.dados)
  if (resultado.ok) revalidatePath("/minha-conta/perfil")
  return deResultado(resultado, "Dados atualizados.")
}

// ── Troca de e-mail com código (feature 016: RF-154, RF-155) ──

export async function pedirTrocaDeEmailAction(formData: FormData): Promise<EstadoFormulario> {
  const usuario = await autorizar("ANUNCIANTE")
  if (!usuario) return NAO_AUTORIZADO
  const lido = lerFormulario(z.object({ emailNovo: texto }), formData)
  if (!lido.ok) return lido.estado
  const resultado = await container().pedirTrocaDeEmail.executar(usuario.id, lido.dados.emailNovo)
  if (!resultado.ok) return deResultado(resultado)
  revalidatePath("/minha-conta/perfil")
  return { ok: true, mensagem: `Mandamos um código para ${resultado.valor.enviadoPara}.` }
}

export async function confirmarTrocaDeEmailAction(formData: FormData): Promise<EstadoFormulario> {
  const usuario = await autorizar("ANUNCIANTE")
  if (!usuario) return NAO_AUTORIZADO
  const lido = lerFormulario(z.object({ codigo: texto }), formData)
  if (!lido.ok) return lido.estado
  const resultado = await container().confirmarTrocaDeEmail.executar(usuario.id, lido.dados.codigo)
  if (!resultado.ok) return deResultado(resultado)
  revalidatePath("/minha-conta/perfil")
  return { ok: true, mensagem: `E-mail trocado para ${resultado.valor.email}.` }
}

export async function cancelarTrocaDeEmailAction(): Promise<EstadoFormulario> {
  const usuario = await autorizar("ANUNCIANTE")
  if (!usuario) return NAO_AUTORIZADO
  await container().cancelarTrocaDeEmail.executar(usuario.id)
  revalidatePath("/minha-conta/perfil")
  return { ok: true, mensagem: "Troca de e-mail cancelada." }
}

// ── "Fechou negócio?" (feature 021: RF-210, RN-211) ──

export async function registrarResultadoAction(anuncioId: string, resultado: string): Promise<EstadoFormulario> {
  const usuario = await autorizar("ANUNCIANTE")
  if (!usuario) return NAO_AUTORIZADO
  const r = await container().registrarResultado.executar({ usuarioId: usuario.id, anuncioId, resultado })
  if (r.ok) revalidatePath(`/minha-conta/anuncios/${anuncioId}`)
  return deResultado(r, r.ok && r.valor === "AINDA_NAO" ? "Resposta guardada." : "Resposta guardada. Obrigado por contar.")
}

// ── Convites (feature 015: RF-250 a RF-255) ──

export async function convidarPorEmailAction(formData: FormData): Promise<EstadoFormulario> {
  const usuario = await autorizar("ANUNCIANTE")
  if (!usuario) return NAO_AUTORIZADO
  const lido = lerFormulario(z.object({ email: texto }), formData)
  if (!lido.ok) return lido.estado
  const r = await container().convidarPorEmail.executar(usuario.id, lido.dados.email)
  if (r.ok) revalidatePath("/minha-conta/convites")
  return deResultado(r, r.ok ? `Convite enviado para ${r.valor.email}.` : undefined)
}

export async function convidarPeloWhatsAppAction(): Promise<{ ok: true; texto: string } | { ok: false; mensagem: string }> {
  const usuario = await autorizar("ANUNCIANTE")
  if (!usuario) return { ok: false, mensagem: NAO_AUTORIZADO.mensagem }
  const r = await container().convidarPeloWhatsApp.executar(usuario.id)
  if (!r.ok) return { ok: false, mensagem: r.mensagem }
  revalidatePath("/minha-conta/convites")
  return { ok: true, texto: r.valor.texto }
}

export async function cancelarConviteAction(conviteId: string): Promise<EstadoFormulario> {
  const usuario = await autorizar("ANUNCIANTE")
  if (!usuario) return NAO_AUTORIZADO
  const r = await container().cancelarConvite.executar(usuario.id, conviteId)
  if (r.ok) revalidatePath("/minha-conta/convites")
  return deResultado(r, "Convite cancelado; ele voltou para você.")
}
