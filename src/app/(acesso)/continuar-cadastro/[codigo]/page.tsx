// APRESENTAÇÃO — continuar ou desistir do cadastro, pelo link do e-mail (feature 024: RF-241, RF-242, RN-242).
// Abrir a página só mostra: a escolha vale com o clique no botão, porque programas de e-mail abrem links sozinhos.

import type { Metadata } from "next"
import Link from "next/link"
import { Faixa } from "@/components/jornal/pecas"
import { LINK_SEM_VALOR } from "@/application/use-cases/acesso/cadastro-sem-confirmacao"
import { diaDoCadastro, escolhaDoEndereco } from "@/domain/usuario/cadastro-sem-confirmacao"
import { container } from "@/infrastructure/container"
import { parametro } from "@/lib/formularios"
import { BotaoContinuarCadastro, BotaoDesistirDoCadastro } from "../../formularios-acesso"

export const metadata: Metadata = { title: "Sua conta", robots: { index: false } }

type Props = { params: Promise<{ codigo: string }>; searchParams: Promise<{ escolha?: string }> }

export default async function ContinuarCadastro({ params, searchParams }: Props) {
  const { codigo } = await params
  const escolha = escolhaDoEndereco(parametro((await searchParams).escolha)) ?? "continuar"
  const conta = await container().continuarOuDesistir.ver(codigo)

  if (!conta) {
    return (
      <div className="flex flex-col gap-5">
        <Faixa como="h1">Link sem valor</Faixa>
        <p>{LINK_SEM_VALOR}</p>
        <p className="text-sm">
          <Link href="/entrar" className="link">
            Entrar
          </Link>{" "}
          ·{" "}
          <Link href="/cadastro" className="link">
            Criar uma conta
          </Link>
        </p>
      </div>
    )
  }

  if (conta.situacao === "CONFIRMADO") {
    return (
      <div className="flex flex-col gap-5">
        <Faixa como="h1">Conta confirmada</Faixa>
        <p>Esta conta já está confirmada. Entre com o seu e-mail e a sua senha para anunciar.</p>
        <Link href="/entrar" className="botao self-start">
          Entrar
        </Link>
      </div>
    )
  }

  const continuar = (
    <section aria-labelledby="titulo-continuar" className="flex flex-col gap-2">
      <h2 id="titulo-continuar" className="font-titulo text-lg font-bold uppercase">
        Continuar
      </h2>
      <p className="text-sm">A conta fica confirmada e você entra com o seu e-mail e a sua senha para publicar anúncios.</p>
      <BotaoContinuarCadastro codigo={codigo} principal={escolha === "continuar"} />
    </section>
  )
  const desistir = (
    <section aria-labelledby="titulo-desistir" className="flex flex-col gap-2">
      <h2 id="titulo-desistir" className="font-titulo text-lg font-bold uppercase">
        Desistir
      </h2>
      <p className="text-sm">A conta e os seus dados são apagados agora. Não dá para desfazer; se mudar de ideia, é só criar uma conta nova.</p>
      <BotaoDesistirDoCadastro codigo={codigo} principal={escolha === "desistir"} />
    </section>
  )

  return (
    <div className="flex flex-col gap-5">
      <Faixa como="h1">Sua conta</Faixa>
      <p>
        Olá, {conta.primeiroNome}. Você criou uma conta em {diaDoCadastro(conta.criadoEm)}, e o e-mail ainda não foi confirmado. Sem resposta até{" "}
        <strong>{diaDoCadastro(conta.apagaEm)}</strong>, a conta será apagada.
      </p>
      {/* A escolha que veio do e-mail aparece primeiro; a outra continua à mão, logo abaixo. */}
      {escolha === "desistir" ? desistir : continuar}
      <div className="border-t border-fio pt-4">{escolha === "desistir" ? continuar : desistir}</div>
    </div>
  )
}
