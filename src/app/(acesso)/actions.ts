"use server"

// APRESENTAÇÃO — entrar, criar conta, sair e trocar senha: formato (Zod) → caso de uso → cookie/redirect.

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
  redirect(destinoSeguro(voltar, "/minha-conta/anuncios/novo"))
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
