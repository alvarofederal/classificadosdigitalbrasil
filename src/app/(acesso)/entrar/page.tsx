import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Faixa } from "@/components/jornal/pecas"
import { parametro } from "@/lib/formularios"
import { areaDoPerfil, usuarioAtual } from "@/lib/sessao"
import { FormularioEntrar } from "../formularios-acesso"

export const metadata: Metadata = { title: "Entrar", robots: { index: false } }

export default async function Entrar({ searchParams }: { searchParams: Promise<{ voltar?: string; confirmada?: string }> }) {
  const usuario = await usuarioAtual()
  if (usuario) redirect(areaDoPerfil(usuario.perfil))
  const busca = await searchParams
  const voltar = parametro(busca.voltar) ?? undefined
  // Feature 024 (RF-241): vem da página de continuar o cadastro.
  const confirmada = parametro(busca.confirmada) === "1"

  return (
    <div className="flex flex-col gap-5">
      <Faixa como="h1">Entrar</Faixa>
      {confirmada && (
        <p role="status" className="border border-sucesso px-3 py-2 text-sm text-sucesso">
          Conta confirmada. Entre com o seu e-mail e a sua senha para anunciar.
        </p>
      )}
      <FormularioEntrar voltar={voltar} />
      <p className="text-sm">
        <Link href="/esqueci-a-senha" className="link">
          Esqueci a senha
        </Link>
      </p>
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
