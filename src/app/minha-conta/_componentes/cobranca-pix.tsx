// APRESENTAÇÃO — o Pix do anúncio: QR Code + copia e cola, com o código que identifica o pagamento (RF-14, ADR-07).

import QRCode from "qrcode"
import type { CobrancaPix } from "@/application/use-cases/pagamentos/pagamentos"
import { formatarReais, plural } from "@/lib/formatadores"
import { CopiarTexto } from "./copiar-texto"

export async function CobrancaPixCartao({ cobranca }: { cobranca: CobrancaPix }) {
  const qr = cobranca.copiaECola ? await QRCode.toDataURL(cobranca.copiaECola, { margin: 1, width: 240, color: { dark: "#141412", light: "#fbf9f3" } }) : null

  return (
    <section aria-labelledby="titulo-pix" className="border-2 border-tinta bg-papel-claro p-4">
      <h2 id="titulo-pix" className="font-titulo text-lg font-bold uppercase tracking-wide">
        Pagamento: {formatarReais(cobranca.valorCentavos)} · {plural(cobranca.dias, "dia", "dias")} no caderno
      </h2>
      {qr && cobranca.copiaECola ? (
        <div className="mt-3 grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR Code do Pix" width={200} height={200} className="mx-auto border border-fio sm:mx-0" />
          <div className="flex min-w-0 flex-col gap-3">
            <ol className="list-decimal pl-5 text-sm leading-relaxed">
              <li>Abra o app do seu banco e escolha pagar com Pix (QR Code ou copia e cola).</li>
              <li>Confira o valor de {formatarReais(cobranca.valorCentavos)} e conclua.</li>
              <li>O anúncio entra no ar assim que o pagamento é confirmado.</li>
            </ol>
            <CopiarTexto texto={cobranca.copiaECola} rotulo="Copiar código Pix" />
            <p className="font-titulo text-xs uppercase tracking-wider text-tinta-suave">Identificador do pagamento: {cobranca.codigo}</p>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-sm">
          O recebimento por Pix ainda está sendo configurado. Seu anúncio está salvo com o código de pagamento <strong>{cobranca.codigo}</strong> e entra no ar
          assim que o pagamento for confirmado.
        </p>
      )}
    </section>
  )
}
