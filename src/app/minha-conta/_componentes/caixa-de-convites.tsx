// APRESENTAÇÃO — convites no alto de Minha conta (feature 015: RF-250).

import Link from "next/link"
import { CONVITES_POR_CONTA, PREMIO_DO_CONVITE } from "@/domain/convite/convite"
import { BotaoConvidarPeloWhatsApp } from "./convites"

export function CaixaDeConvites({ disponiveis }: { disponiveis: number }) {
  return (
    <section aria-labelledby="titulo-convites" className="flex flex-col gap-2 border border-tinta p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="titulo-convites" className="font-titulo text-lg font-bold uppercase">
          Convide amigos
        </h2>
        <Link href="/minha-conta/convites" className="link text-sm">
          Convidar por e-mail e ver os convites
        </Link>
      </div>
      <p className="text-sm">
        Você tem <strong>{disponiveis}</strong> de {CONVITES_POR_CONTA} convites. Para cada amigo que criar a conta e publicar o primeiro anúncio, você ganha{" "}
        {PREMIO_DO_CONVITE.dias} dias com foto.
      </p>
      <div>
        <BotaoConvidarPeloWhatsApp desabilitado={disponiveis === 0} />
      </div>
    </section>
  )
}
