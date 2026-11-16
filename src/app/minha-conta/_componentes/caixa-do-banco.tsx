// APRESENTAÇÃO — saldo do banco de dias no alto de Minha conta (feature 017: RF-170).

import Link from "next/link"
import { MINIMO_PARA_PUBLICAR, type SaldoDoBanco, diasPorExtenso, totalDeDias } from "@/domain/banco/banco-de-dias"

export function CaixaDoBanco({ saldo, comLinkDoExtrato = true }: { saldo: SaldoDoBanco; comLinkDoExtrato?: boolean }) {
  const total = totalDeDias(saldo)
  return (
    <section aria-labelledby="titulo-banco" className="flex flex-col gap-2 border-2 border-tinta p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="titulo-banco" className="font-titulo text-lg font-bold uppercase">
          Seu banco de dias
        </h2>
        {comLinkDoExtrato && (
          <Link href="/minha-conta/banco" className="link text-sm">
            Ver entradas e saídas
          </Link>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <p className="border border-fio px-3 py-2">
          <span className="font-manchete text-3xl">{saldo.SIMPLES}</span> <span className="text-sm">{saldo.SIMPLES === 1 ? "dia sem foto" : "dias sem foto"}</span>
        </p>
        <p className="border border-fio px-3 py-2">
          <span className="font-manchete text-3xl">{saldo.FOTOS}</span> <span className="text-sm">{saldo.FOTOS === 1 ? "dia com foto" : "dias com foto"}</span>
        </p>
      </div>
      <p className="text-sm">
        {total === 0
          ? "Seu banco está vazio. Os anúncios continuam podendo ser pagos com Pix."
          : `Use os dias para pôr um anúncio no caderno sem pagar: escolha "Usar dias do banco" ao criar ou renovar. Cada anúncio novo usa pelo menos ${MINIMO_PARA_PUBLICAR} dias; dias com foto liberam o álbum de fotos. Os dias não vencem.`}
      </p>
      {total > 0 && saldo.SIMPLES < MINIMO_PARA_PUBLICAR && saldo.FOTOS < MINIMO_PARA_PUBLICAR && (
        <p className="text-sm">
          Com {diasPorExtenso(saldo.SIMPLES, "SIMPLES")} e {diasPorExtenso(saldo.FOTOS, "FOTOS")}, dá para dar mais dias a um anúncio que já está no ar.
        </p>
      )}
    </section>
  )
}
