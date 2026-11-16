// APRESENTAÇÃO — a página do link do convite (feature 015: RF-253, RN-252, RN-255, RN-257).

import type { Metadata } from "next"
import Link from "next/link"
import { Faixa } from "@/components/jornal/pecas"
import { container } from "@/infrastructure/container"
import { usuarioAtual } from "@/lib/sessao"

export const metadata: Metadata = { title: "Convite", robots: { index: false } }

export default async function Convite({ params }: { params: Promise<{ codigo: string }> }) {
  const codigo = (await params).codigo.toUpperCase()
  const [convite, usuario] = await Promise.all([container().verConvite.executar(codigo), usuarioAtual()])

  if (!convite.ok) {
    return (
      <div className="flex flex-col gap-5">
        <Faixa como="h1">Convite</Faixa>
        <p>{convite.mensagem} Você pode criar a sua conta do mesmo jeito.</p>
        <Link href="/cadastro" className="botao self-start">
          Criar minha conta
        </Link>
      </div>
    )
  }

  const { nomeDeQuemConvida, canal, emailDestino, presente } = convite.valor
  return (
    <div className="flex flex-col gap-5">
      <Faixa como="h1">Você foi convidado</Faixa>
      <p>
        <strong>{nomeDeQuemConvida}</strong> anuncia no Classificados Digitais do Brasil, os classificados da sua cidade no formato do jornal, e convidou você.
      </p>
      {presente && (
        <p className="border-2 border-tinta px-3 py-2">
          Criando a conta, você ganha <strong>{presente.SIMPLES} dias sem foto</strong> e <strong>{presente.FOTOS} dias com foto</strong> para anunciar de graça.
        </p>
      )}
      {canal === "EMAIL" && emailDestino && (
        <p className="text-sm">
          Este convite vale para a conta criada com o e-mail <strong className="break-all">{emailDestino}</strong>.
        </p>
      )}
      {usuario ? (
        <p className="text-sm">Você já entrou numa conta; o convite serve para quem ainda não tem conta.</p>
      ) : (
        <Link href={`/cadastro?convite=${encodeURIComponent(codigo)}`} className="botao self-start">
          Aceitar o convite e criar a conta
        </Link>
      )}
    </div>
  )
}
