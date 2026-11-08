// APRESENTAÇÃO — cola entre o cookie do Next e os casos de uso de sessão (ADR-03, ADR-04).
import "server-only"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { cache } from "react"
import type { UsuarioDaSessao } from "@/application/ports/acesso"
import type { Perfil } from "@/domain/usuario/usuario"
import { container } from "@/infrastructure/container"

export const NOME_DO_COOKIE = "cdb_sessao"

export async function lerToken(): Promise<string | undefined> {
  return (await cookies()).get(NOME_DO_COOKIE)?.value
}

/** Uma consulta por requisição, mesmo chamada por layout, página e componentes. */
export const usuarioAtual = cache(async (): Promise<UsuarioDaSessao | null> => {
  return container().obterSessao.executar(await lerToken())
})

export async function gravarCookieDeSessao(token: string, expiraEm: Date): Promise<void> {
  ;(await cookies()).set(NOME_DO_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiraEm,
  })
}

export async function apagarCookieDeSessao(): Promise<void> {
  ;(await cookies()).delete(NOME_DO_COOKIE)
}

export function areaDoPerfil(perfil: Perfil): string {
  return perfil === "ADMIN" ? "/painel" : "/minha-conta"
}

/** Para layouts e páginas: redireciona quem não pode estar ali. */
export async function exigirPerfil(perfil: Perfil, voltar?: string): Promise<UsuarioDaSessao> {
  const usuario = await usuarioAtual()
  if (!usuario) redirect(voltar ? `/entrar?voltar=${encodeURIComponent(voltar)}` : "/entrar")
  if (usuario.deveTrocarSenha) redirect("/trocar-senha")
  if (usuario.perfil !== perfil) redirect(areaDoPerfil(usuario.perfil))
  return usuario
}

/** Para Server Actions: devolve o usuário autorizado ou null — nunca confia no que a tela escondeu. */
export async function autorizar(perfil: Perfil): Promise<UsuarioDaSessao | null> {
  const usuario = await usuarioAtual()
  if (!usuario || usuario.deveTrocarSenha || usuario.perfil !== perfil) return null
  return usuario
}

export const NAO_AUTORIZADO = { ok: false as const, mensagem: "Sua sessão expirou. Entre de novo." }
