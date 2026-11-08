// APRESENTAÇÃO — primeira barreira (ADR-04): sem cookie de sessão, áreas protegidas vão para o login.
// O perfil é conferido no servidor em cada layout, página e Server Action (src/lib/sessao.ts).
import { type NextRequest, NextResponse } from "next/server"

const NOME_DO_COOKIE = "cdb_sessao"

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  if (!request.cookies.get(NOME_DO_COOKIE)?.value) {
    const entrar = new URL("/entrar", request.url)
    entrar.searchParams.set("voltar", `${pathname}${search}`)
    return NextResponse.redirect(entrar)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/minha-conta/:path*", "/painel/:path*"],
}
