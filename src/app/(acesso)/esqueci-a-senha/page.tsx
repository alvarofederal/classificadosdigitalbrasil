// APRESENTAÇÃO — esqueci a senha: código por e-mail e senha nova (feature 016: RF-153, RN-156, RN-157).

import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Faixa } from "@/components/jornal/pecas"
import { areaDoPerfil, usuarioAtual } from "@/lib/sessao"
import { FormularioEsqueciASenha } from "../formularios-acesso"

export const metadata: Metadata = { title: "Esqueci a senha", robots: { index: false } }

export default async function EsqueciASenha() {
  const usuario = await usuarioAtual()
  if (usuario) redirect(areaDoPerfil(usuario.perfil))

  return (
    <div className="flex flex-col gap-5">
      <Faixa como="h1">Esqueci a senha</Faixa>
      <p className="text-sm">Informe o e-mail da conta. Mandamos um código para ele, e com o código você cria uma senha nova.</p>
      <FormularioEsqueciASenha />
      <p className="text-sm">
        Lembrou a senha?{" "}
        <Link href="/entrar" className="link">
          Entrar
        </Link>
        .
      </p>
    </div>
  )
}
