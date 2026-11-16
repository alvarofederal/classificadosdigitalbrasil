// APRESENTAÇÃO — QR Code do anúncio com a legenda (feature 022: RF-220, RF-221). Componente de servidor.

import { qrCodeDoAnuncioEmDataUrl } from "@/lib/qrcode"
import { cn } from "@/lib/utils"

export async function QrCodeDoAnuncio({
  codigo,
  tamanho = 160,
  legenda = "Aponte a câmera do celular para abrir este anúncio",
  className,
}: {
  codigo: string
  /** Lado do QR na tela, em pixels; a imagem sai com o dobro, para ficar nítida. */
  tamanho?: number
  legenda?: string | null
  className?: string
}) {
  const qr = await qrCodeDoAnuncioEmDataUrl(codigo, tamanho * 2)
  return (
    <figure className={cn("flex items-center gap-3", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qr} alt="QR Code do anúncio" width={tamanho} height={tamanho} className="shrink-0" />
      {legenda && <figcaption className="text-sm">{legenda}</figcaption>}
    </figure>
  )
}
