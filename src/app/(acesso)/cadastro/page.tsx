import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Faixa } from "@/components/jornal/pecas"
import { parametro } from "@/lib/formularios"
import { areaDoPerfil, usuarioAtual } from "@/lib/sessao"
import { container } from "@/infrastructure/container"
import { FormularioCadastro } from "../formularios-acesso"

export const metadata: Metadata = { title: "Criar conta", robots: { index: false } }

export default async function Cadastro({ searchParams }: { searchParams: Promise<{ voltar?: string; convite?: string }> }) {
  const usuario = await usuarioAtual()
  if (usuario) redirect(areaDoPerfil(usuario.perfil))
  const busca = await searchParams
  const voltar = parametro(busca.voltar) ?? undefined
  // Feature 015 (RF-254): a conta criada daqui fica ligada ao convite, se ele ainda valer.
  const codigoDoConvite = parametro(busca.convite)?.toUpperCase() ?? undefined
  const convite = codigoDoConvite ? await container().verConvite.executar(codigoDoConvite) : null

  return (
    <div className="flex flex-col gap-5">
      <Faixa como="h1">Criar conta de anunciante</Faixa>
      <p className="text-sm">
        Com a conta você publica quantos anúncios quiser, paga cada um por Pix e recebe as mensagens dos interessados.
      </p>
      {convite?.ok && (
        <p className="border-2 border-tinta px-3 py-2 text-sm">
          Convite de <strong>{convite.valor.nomeDeQuemConvida}</strong>.
          {convite.valor.canal === "EMAIL" && " Crie a conta com o e-mail que recebeu o convite."}
        </p>
      )}
      <FormularioCadastro
        voltar={voltar}
        convite={convite?.ok ? codigoDoConvite : undefined}
        emailDoConvite={convite?.ok && convite.valor.canal === "EMAIL" ? convite.valor.emailDestino : null}
      />
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
