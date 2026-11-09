"use client"

// APRESENTAÇÃO — "Anúncios perto de mim" (feature 002: RF-41 a RF-43).
// Pede a localização ao navegador só quando a pessoa clica; se a permissão já foi dada, mostra o atalho direto.

import { LocateFixed, Loader2, MapPin } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { localizarCidadeAction } from "@/app/(site)/actions"

const CHAVE_ULTIMA_CIDADE = "cdb:ultima-cidade"

interface CidadeGuardada {
  uf: string
  slug: string
  nome: string
}

export function guardarUltimaCidade(cidade: CidadeGuardada) {
  try {
    localStorage.setItem(CHAVE_ULTIMA_CIDADE, JSON.stringify(cidade))
  } catch {
    // Navegação privada ou armazenamento bloqueado: o atalho só não aparece.
  }
}

function lerUltimaCidade(): CidadeGuardada | null {
  try {
    const bruto = localStorage.getItem(CHAVE_ULTIMA_CIDADE)
    const cidade = bruto ? (JSON.parse(bruto) as CidadeGuardada) : null
    return cidade?.uf && cidade.slug && cidade.nome ? cidade : null
  } catch {
    return null
  }
}

/** Grava a cidade da página atual como "última cidade" (RF-43). */
export function LembrarCidade({ uf, slug, nome }: CidadeGuardada) {
  useEffect(() => guardarUltimaCidade({ uf, slug, nome }), [uf, slug, nome])
  return null
}

export function PertoDeMim() {
  const router = useRouter()
  const [ultima, setUltima] = useState<CidadeGuardada | null>(null)
  const [estado, setEstado] = useState<"parado" | "buscando" | "negado" | "erro">("parado")
  const [mensagem, setMensagem] = useState("")
  const [suportado, setSuportado] = useState(true)

  useEffect(() => {
    setUltima(lerUltimaCidade())
    const temGeo = "geolocation" in navigator
    setSuportado(temGeo)
    // RF-42: com permissão já concedida, descobre a cidade em silêncio e troca o atalho, sem novo pedido.
    if (!temGeo || !navigator.permissions?.query) return
    navigator.permissions
      .query({ name: "geolocation" })
      .then((permissao) => {
        if (permissao.state !== "granted") return
        navigator.geolocation.getCurrentPosition(async (posicao) => {
          const r = await localizarCidadeAction(posicao.coords.latitude, posicao.coords.longitude)
          if (r.ok) setUltima({ uf: r.uf, slug: r.slug, nome: r.nome })
        })
      })
      .catch(() => undefined)
  }, [])

  function localizar() {
    if (!("geolocation" in navigator)) return
    setEstado("buscando")
    navigator.geolocation.getCurrentPosition(
      async (posicao) => {
        const r = await localizarCidadeAction(posicao.coords.latitude, posicao.coords.longitude)
        if (!r.ok) {
          setEstado("erro")
          setMensagem(r.mensagem)
          return
        }
        guardarUltimaCidade({ uf: r.uf, slug: r.slug, nome: r.nome })
        router.push(`/${r.uf.toLowerCase()}/${r.slug}`)
      },
      (erro) => {
        setEstado(erro.code === erro.PERMISSION_DENIED ? "negado" : "erro")
        setMensagem(
          erro.code === erro.PERMISSION_DENIED
            ? "Sem permissão para a localização. Escolha o estado e a cidade acima."
            : "Não foi possível saber sua localização agora. Escolha o estado e a cidade acima.",
        )
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 10 * 60_000 },
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {suportado && (
        <button type="button" onClick={localizar} disabled={estado === "buscando"} className="botao botao-vazado">
          {estado === "buscando" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <LocateFixed className="size-4" aria-hidden />}
          {estado === "buscando" ? "Procurando sua cidade…" : "Anúncios perto de mim"}
        </button>
      )}
      {ultima && (
        <Link href={`/${ultima.uf.toLowerCase()}/${ultima.slug}`} className="inline-flex items-center gap-1.5 font-titulo text-sm font-semibold uppercase tracking-wide hover:underline">
          <MapPin className="size-4" aria-hidden />
          Continuar em {ultima.nome}/{ultima.uf}
        </Link>
      )}
      {(estado === "negado" || estado === "erro") && (
        <p role="status" className="w-full text-sm text-tinta-suave">
          {mensagem}
        </p>
      )}
    </div>
  )
}
