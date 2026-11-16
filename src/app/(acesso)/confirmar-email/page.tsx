// APRESENTAÇÃO — confirmar o e-mail da conta nova com o código (feature 016: RF-150 a RF-152).

import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Faixa } from "@/components/jornal/pecas"
import { parametro } from "@/lib/formularios"
import { areaDoPerfil, usuarioAtual } from "@/lib/sessao"
import { sairAction } from "../actions"
import { BotaoReenviarCodigo, FormularioConfirmarEmail, FormularioCorrigirEmail } from "../formularios-acesso"

export const metadata: Metadata = { title: "Confirme seu e-mail", robots: { index: false } }

export default async function ConfirmarEmail({ searchParams }: { searchParams: Promise<{ voltar?: string; envio?: string }> }) {
  const usuario = await usuarioAtual()
  if (!usuario) redirect("/entrar")
  if (usuario.emailConfirmado) redirect(areaDoPerfil(usuario.perfil))
  const busca = await searchParams
  const voltar = parametro(busca.voltar) ?? undefined
  const envioFalhou = parametro(busca.envio) === "falhou"

  return (
    <div className="flex flex-col gap-5">
      <Faixa como="h1">Confirme seu e-mail</Faixa>
      {envioFalhou ? (
        <p role="alert" className="border border-perigo bg-perigo/5 px-3 py-2 text-sm text-perigo">
          Sua conta foi criada, mas não foi possível enviar o código agora. Use o botão Mandar outro código em alguns minutos.
        </p>
      ) : (
        <p className="text-sm">
          Mandamos um código de 6 números para <strong className="break-all">{usuario.email}</strong>. Digite o código abaixo para liberar a conta. Ele vale
          por 15 minutos; se não chegar, confira a caixa de spam.
        </p>
      )}
      <FormularioConfirmarEmail voltar={voltar} />

      <div className="flex flex-wrap items-center gap-3 border-t border-fio pt-4">
        <BotaoReenviarCodigo />
        <form action={sairAction}>
          <button type="submit" className="text-sm underline">
            Sair
          </button>
        </form>
      </div>

      <details className="border-t border-fio pt-4">
        <summary className="cursor-pointer text-sm font-semibold">Digitou o e-mail errado?</summary>
        <div className="pt-3">
          <FormularioCorrigirEmail />
        </div>
      </details>
    </div>
  )
}
