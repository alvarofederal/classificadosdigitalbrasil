// APRESENTAÇÃO — depois de desistir do cadastro (feature 024: RF-242).

import type { Metadata } from "next"
import Link from "next/link"
import { Faixa } from "@/components/jornal/pecas"

export const metadata: Metadata = { title: "Conta apagada", robots: { index: false } }

export default function ContaApagada() {
  return (
    <div className="flex flex-col gap-5">
      <Faixa como="h1">Conta apagada</Faixa>
      <p>A sua conta e os seus dados foram apagados do Classificados. Se mudar de ideia, é só criar uma conta nova.</p>
      <Link href="/" className="link self-start">
        Ir para a capa
      </Link>
    </div>
  )
}
