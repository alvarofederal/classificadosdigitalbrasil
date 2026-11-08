import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Faixa } from "@/components/jornal/pecas"
import { parametro } from "@/lib/formularios"
import { areaDoPerfil, usuarioAtual } from "@/lib/sessao"
import { FormularioEntrar } from "../formularios-acesso"

export const metadata: Metadata = { title: "Entrar", robots: { index: false } }

export default async function Entrar({ searchParams }: { searchParams: Promise<{ voltar?: string }> }) {
  const usuario = await usuarioAtual()
  if (usuario) redirect(areaDoPerfil(usuario.perfil))
  const voltar = parametro((await searchParams).voltar) ?? undefined

  return (
    <div className="flex flex-col gap-5">
      <Faixa como="h1">Entrar</Faixa>
      <FormularioEntrar voltar={voltar} />
      <p className="text-sm">
        Ainda não tem conta?{" "}
        <Link href={voltar ? `/cadastro?voltar=${encodeURIComponent(voltar)}` : "/cadastro"} className="link">
          Crie a sua para anunciar
        </Link>
        .
      </p>
    </div>
  )
}
