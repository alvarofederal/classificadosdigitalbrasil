"use client"

// APRESENTAÇÃO — avisa a visita depois que a página do anúncio abriu (feature 013: RF-130, RN-134; ADR-18).
// Quem não roda JavaScript (prévia de link, a maioria dos robôs) e o pré-carregamento de links não chegam aqui.

import { useEffect } from "react"
import { INTERVALO_ENTRE_AVISOS_DE_VISITA_MS } from "@/domain/anuncio/visitas"

const PREFIXO = "cdb_visita_"

export function AvisoDeVisita({ codigo }: { codigo: string }) {
  useEffect(() => {
    const marca = `${PREFIXO}${codigo}`
    const agora = Date.now()
    try {
      // RN-134: uma visita a cada 30 minutos por anúncio neste navegador.
      const ultimo = Number(localStorage.getItem(marca))
      if (ultimo && agora - ultimo < INTERVALO_ENTRE_AVISOS_DE_VISITA_MS) return
      localStorage.setItem(marca, String(agora))
    } catch {
      // Armazenamento bloqueado: avisa assim mesmo; o servidor limita por pessoa e dia.
    }
    fetch("/api/visitas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codigo }),
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => {})
  }, [codigo])
  return null
}
