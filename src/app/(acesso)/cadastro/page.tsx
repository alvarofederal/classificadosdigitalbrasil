import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Faixa } from "@/components/jornal/pecas"
import { parametro } from "@/lib/formularios"
import { areaDoPerfil, usuarioAtual } from "@/lib/sessao"
import { FormularioCadastro } from "../formularios-acesso"

export const metadata: Metadata = { title: "Criar conta", robots: { index: false } }

export default async function Cadastro({ searchParams }: { searchParams: Promise<{ voltar?: string }> }) {
  const usuario = await usuarioAtual()
  if (usuario) redirect(areaDoPerfil(usuario.perfil))
  const voltar = parametro((await searchParams).voltar) ?? undefined

  return (
    <div className="flex flex-col gap-5">
      <Faixa como="h1">Criar conta de anunciante</Faixa>
      <p className="text-sm">
        Com a conta você publica quantos anúncios quiser, paga cada um por Pix e recebe as mensagens dos interessados.
      </p>
      <FormularioCadastro voltar={voltar} />
      <p className="text-sm">
        Já tem conta?{" "}
        <Link href={voltar ? `/entrar?voltar=${encodeURIComponent(voltar)}` : "/entrar"} className="link">
          Entrar
        </Link>
        .
      </p>
    </div>
  )
}
