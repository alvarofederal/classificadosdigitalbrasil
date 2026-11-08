import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Faixa } from "@/components/jornal/pecas"
import { usuarioAtual } from "@/lib/sessao"
import { FormularioTrocarSenha } from "../formularios-acesso"

export const metadata: Metadata = { title: "Trocar senha", robots: { index: false } }

export default async function TrocarSenha() {
  const usuario = await usuarioAtual()
  if (!usuario) redirect("/entrar")
  return (
    <div className="flex flex-col gap-5">
      <Faixa como="h1">Trocar senha</Faixa>
      <FormularioTrocarSenha obrigatoria={usuario.deveTrocarSenha} />
    </div>
  )
}
