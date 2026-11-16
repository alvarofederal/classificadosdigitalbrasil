"use server"

// APRESENTAÇÃO — entrar, criar conta, sair, trocar senha e código por e-mail: formato (Zod) → caso de uso → cookie/redirect.

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"
import { container } from "@/infrastructure/container"
import { type EstadoFormulario, checkbox, codigoIbge, deResultado, lerFormulario, texto } from "@/lib/formularios"
import { apagarCookieDeSessao, areaDoPerfil, gravarCookieDeSessao, lerToken, usuarioAtual } from "@/lib/sessao"

/** Só caminhos internos — evita redirecionamento aberto. */
function destinoSeguro(voltar: string | undefined | null, padrao: string): string {
  return voltar && voltar.startsWith("/") && !voltar.startsWith("//") && !voltar.startsWith("/\\") ? voltar : padrao
}

const schemaEntrar = z.object({
  email: z.string().trim().min(1, "Informe o e-mail.").max(160),
  senha: z.string().min(1, "Informe a senha.").max(200),
  voltar: z.string().optional(),
})

export async function entrarAction(formData: FormData): Promise<EstadoFormulario> {
  const lido = lerFormulario(schemaEntrar, formData)
  if (!lido.ok) return lido.estado

  const cabecalhos = await headers()
  const ip = cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim() || cabecalhos.get("x-real-ip") || "local"
  const resultado = await container().autenticar.executar({ email: lido.dados.email, senha: lido.dados.senha, ip })
  if (!resultado.ok) return { ok: false, mensagem: resultado.mensagem, codigo: resultado.codigo }

  await gravarCookieDeSessao(resultado.valor.token, resultado.valor.expiraEm)
  if (resultado.valor.deveTrocarSenha) redirect("/trocar-senha")
  const area = areaDoPerfil(resultado.valor.perfil)
  // O admin sempre cai no painel; o anunciante volta para onde estava (ex.: "Anunciar").
  redirect(resultado.valor.perfil === "ADMIN" ? area : destinoSeguro(lido.dados.voltar, area))
}

const schemaCadastro = z.object({
  nome: texto,
  cpf: texto,
  email: texto,
  celular: texto,
  uf: texto,
  cidadeCodigo: codigoIbge,
  senha: texto,
  confirmacaoSenha: texto,
  aceitouTermos: checkbox,
  voltar: z.string().optional(),
})

export async function cadastrarAction(formData: FormData): Promise<EstadoFormulario> {
  const lido = lerFormulario(schemaCadastro, formData)
  if (!lido.ok) return lido.estado
  const { voltar, ...dados } = lido.dados
  const resultado = await container().cadastrarAnunciante.executar(dados)
  if (!resultado.ok) return deResultado(resultado)
  await gravarCookieDeSessao(resultado.valor.token, resultado.valor.expiraEm)
  // RF-150: a conta nova vai para a tela do código; depois dele, segue para onde ia.
  const destino = encodeURIComponent(destinoSeguro(voltar, "/minha-conta/anuncios/novo"))
  redirect(`/confirmar-email?voltar=${destino}${resultado.valor.codigoEnviado ? "" : "&envio=falhou"}`)
}

// ── Código por e-mail (feature 016) ──

const schemaCodigo = z.object({ codigo: texto, voltar: z.string().optional() })

export async function confirmarEmailAction(formData: FormData): Promise<EstadoFormulario> {
  const usuario = await usuarioAtual()
  if (!usuario) redirect("/entrar")
  const lido = lerFormulario(schemaCodigo, formData)
  if (!lido.ok) return lido.estado
  const resultado = await container().confirmarEmail.executar(usuario.id, lido.dados.codigo)
  if (!resultado.ok) return deResultado(resultado)
  const area = areaDoPerfil(usuario.perfil)
  redirect(usuario.perfil === "ADMIN" ? area : destinoSeguro(lido.dados.voltar, area))
}

export async function reenviarCodigoAction(): Promise<EstadoFormulario> {
  const usuario = await usuarioAtual()
  if (!usuario) redirect("/entrar")
  const resultado = await container().reenviarCodigoDoCadastro.executar(usuario.id)
  if (!resultado.ok) return deResultado(resultado)
  return { ok: true, mensagem: `Mandamos outro código para ${resultado.valor.enviadoPara}.` }
}

export async function corrigirEmailAction(formData: FormData): Promise<EstadoFormulario> {
  const usuario = await usuarioAtual()
  if (!usuario) redirect("/entrar")
  const lido = lerFormulario(z.object({ email: texto }), formData)
  if (!lido.ok) return lido.estado
  const resultado = await container().corrigirEmailDoCadastro.executar(usuario.id, lido.dados.email)
  if (!resultado.ok) return deResultado(resultado)
  return { ok: true, mensagem: `E-mail corrigido. Mandamos um código para ${resultado.valor.enviadoPara}.` }
}

export async function pedirNovaSenhaAction(formData: FormData): Promise<EstadoFormulario> {
  const lido = lerFormulario(z.object({ email: texto }), formData)
  if (!lido.ok) return lido.estado
  const resultado = await container().pedirNovaSenha.executar(lido.dados.email)
  if (!resultado.ok) return deResultado(resultado)
  return { ok: true, mensagem: resultado.valor }
}

const schemaNovaSenha = z.object({ email: texto, codigo: texto, novaSenha: texto, confirmacaoSenha: texto })

export async function criarNovaSenhaAction(formData: FormData): Promise<EstadoFormulario> {
  const lido = lerFormulario(schemaNovaSenha, formData)
  if (!lido.ok) return lido.estado
  const resultado = await container().criarNovaSenha.executar(lido.dados)
  if (!resultado.ok) return deResultado(resultado)
  await gravarCookieDeSessao(resultado.valor.token, resultado.valor.expiraEm)
  redirect(areaDoPerfil(resultado.valor.perfil))
}

export async function sairAction(): Promise<void> {
  await container().encerrarSessao.executar(await lerToken())
  await apagarCookieDeSessao()
  redirect("/")
}

const schemaSenha = z.object({
  senhaAtual: texto,
  novaSenha: texto,
  confirmacaoSenha: texto,
})

export async function trocarSenhaAction(formData: FormData): Promise<EstadoFormulario> {
  const usuario = await usuarioAtual()
  const token = await lerToken()
  if (!usuario || !token) redirect("/entrar")
  const lido = lerFormulario(schemaSenha, formData)
  if (!lido.ok) return lido.estado
  const resultado = await container().alterarSenha.executar({ usuarioId: usuario.id, tokenAtual: token, ...lido.dados })
  if (!resultado.ok) return deResultado(resultado)
  redirect(areaDoPerfil(usuario.perfil))
}
