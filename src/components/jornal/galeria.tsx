"use client"

// APRESENTAÇÃO — fotos na página do anúncio: foto principal e miniaturas (feature 005: RF-71).

import Image from "next/image"
import { useState } from "react"
import { urlImagem } from "@/lib/imagens"
import { cn } from "@/lib/utils"

export function Galeria({ fotos, titulo }: { fotos: Array<{ id: string; url: string }>; titulo: string }) {
  const [indice, setIndice] = useState(0)
  if (fotos.length === 0) return null
  const atual = fotos[Math.min(indice, fotos.length - 1)]

  return (
    <div className="flex flex-col gap-2">
      <div className="relative aspect-[4/3] w-full border border-tinta bg-papel-escuro">
        <Image src={urlImagem(atual.url, { largura: 1200 })} alt={`Foto ${indice + 1} de ${titulo}`} fill sizes="(max-width: 1024px) 100vw, 640px" className="object-contain" unoptimized priority />
      </div>
      {fotos.length > 1 && (
        <div className="grid grid-cols-6 gap-1.5">
          {fotos.map((foto, i) => (
            <button
              key={foto.id}
              type="button"
              onClick={() => setIndice(i)}
              aria-label={`Ver foto ${i + 1}`}
              className={cn("relative aspect-square border-2", i === indice ? "border-tinta" : "border-transparent opacity-70 hover:opacity-100")}
            >
              <Image src={urlImagem(foto.url, { largura: 200, altura: 200, recorte: true })} alt="" fill sizes="100px" className="object-cover" unoptimized />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
