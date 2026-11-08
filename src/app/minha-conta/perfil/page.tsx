// APRESENTAÇÃO — perfil do anunciante (RF-20, RF-21).

import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Faixa } from "@/components/jornal/pecas"
import { mascararCpf } from "@/domain/usuario/cpf"
import { container } from "@/infrastructure/container"
import { formatarCelular, formatarDia } from "@/lib/formatadores"
import { exigirPerfil } from "@/lib/sessao"
import { FormularioTrocarSenha } from "../../(acesso)/formularios-acesso"
import { FormularioPerfil } from "./formulario-perfil"

export const metadata: Metadata = { title: "Meus dados", robots: { index: false } }

export default async function Perfil() {
  const usuario = await exigirPerfil("ANUNCIANTE")
  const perfil = await container().minhaConta.perfil(usuario.id)
  if (!perfil) notFound()

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section className="flex flex-col gap-4">
        <Faixa como="h1">Meus dados</Faixa>
        <p className="text-sm">
          CPF {perfil.cpf ? mascararCpf(perfil.cpf) : "—"} · conta criada em {formatarDia(perfil.criadoEm)}. O CPF não pode ser alterado.
        </p>
        <FormularioPerfil iniciais={{ nome: perfil.nome, email: perfil.email, celular: formatarCelular(perfil.celular), uf: perfil.uf, cidadeCodigo: perfil.cidadeCodigo }} />
      </section>
      <section className="flex flex-col gap-4">
        <Faixa como="h2">Trocar senha</Faixa>
        <FormularioTrocarSenha />
      </section>
    </div>
  )
}
