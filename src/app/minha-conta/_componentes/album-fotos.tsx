"use client"

// APRESENTAÇÃO — álbum do anúncio (RF-16, ADR-05).
// 1) redimensiona no navegador  2) pede assinaturas ao servidor  3) envia direto ao Cloudinary  4) registra.

import { ArrowLeft, ArrowRight, Camera, Loader2, Trash2 } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, useTransition } from "react"
import { toast } from "sonner"
import { MAXIMO_FOTOS } from "@/domain/anuncio/anuncio"
import { urlImagem } from "@/lib/imagens"
import { cn } from "@/lib/utils"
import { adicionarFotosAction, prepararUploadAction, removerFotoAction, reordenarFotosAction } from "../actions"

const LADO_MAXIMO = 1600
const QUALIDADE_JPEG = 0.82
const LIMITE_BYTES = 10 * 1024 * 1024
const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]

type Foto = { id: string; url: string }
type Envio = { nome: string; progresso: number; erro?: string }

export function AlbumFotos({ anuncioId, fotos: iniciais }: { anuncioId: string; fotos: Foto[] }) {
  const router = useRouter()
  const [fotos, setFotos] = useState(iniciais)
  const [envios, setEnvios] = useState<Envio[]>([])
  const [enviando, setEnviando] = useState(false)
  const [, iniciar] = useTransition()
  const entrada = useRef<HTMLInputElement>(null)

  useEffect(() => setFotos(iniciais), [iniciais])

  async function enviar(arquivos: File[]) {
    const vagas = MAXIMO_FOTOS - fotos.length
    if (arquivos.length === 0) return
    const validos = arquivos.filter((a) => !a.type || TIPOS_ACEITOS.includes(a.type)).slice(0, vagas)
    if (validos.length < arquivos.length) toast.warning(`Entraram ${validos.length} foto(s). O álbum aceita até ${MAXIMO_FOTOS}, em JPG, PNG, WEBP ou HEIC.`)
    if (validos.length === 0) return

    setEnviando(true)
    setEnvios(validos.map((a) => ({ nome: a.name, progresso: 0 })))
    try {
      const preparo = await prepararUploadAction(anuncioId, validos.length)
      if (!preparo.ok || !("assinaturas" in preparo)) {
        toast.error(preparo.mensagem ?? "Não foi possível enviar as fotos.")
        return
      }
      const resultados = await Promise.all(
        validos.map(async (arquivo, i) => {
          try {
            const pronto = await redimensionar(arquivo)
            if (pronto.size > LIMITE_BYTES) throw new Error("Arquivo muito grande (máx. 10 MB).")
            const resposta = await enviarComProgresso(preparo.assinaturas[i], pronto, (p) => atualizar(i, { progresso: p }))
            atualizar(i, { progresso: 100 })
            return { url: resposta.secure_url, publicId: resposta.public_id }
          } catch (erro) {
            atualizar(i, { erro: erro instanceof Error ? erro.message : "Falha no envio." })
            return null
          }
        }),
      )
      const enviadas = resultados.filter((r): r is NonNullable<typeof r> => r !== null)
      if (enviadas.length > 0) {
        const registro = await adicionarFotosAction(anuncioId, enviadas)
        if (registro && !registro.ok) toast.error(registro.mensagem)
        else toast.success(enviadas.length === 1 ? "Foto adicionada ao álbum." : `${enviadas.length} fotos adicionadas ao álbum.`)
        router.refresh()
      }
      if (enviadas.length === validos.length) setTimeout(() => setEnvios([]), 1500)
    } finally {
      setEnviando(false)
      if (entrada.current) entrada.current.value = ""
    }
  }

  function atualizar(indice: number, parcial: Partial<Envio>) {
    setEnvios((atual) => atual.map((e, i) => (i === indice ? { ...e, ...parcial } : e)))
  }

  function mover(de: number, para: number) {
    if (para < 0 || para >= fotos.length || de === para) return
    const anterior = fotos
    const copia = [...fotos]
    const [foto] = copia.splice(de, 1)
    copia.splice(para, 0, foto)
    setFotos(copia)
    iniciar(async () => {
      const r = await reordenarFotosAction(anuncioId, copia.map((f) => f.id))
      if (r && !r.ok) {
        setFotos(anterior)
        toast.error(r.mensagem)
      } else router.refresh()
    })
  }

  function remover(foto: Foto) {
    if (!window.confirm("Remover esta foto do álbum?")) return
    iniciar(async () => {
      const r = await removerFotoAction(anuncioId, foto.id)
      if (r && !r.ok) toast.error(r.mensagem)
      else {
        setFotos((atual) => atual.filter((f) => f.id !== foto.id))
        toast.success("Foto removida.")
        router.refresh()
      }
    })
  }

  const cheio = fotos.length >= MAXIMO_FOTOS

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className={cn("botao cursor-pointer", (enviando || cheio) && "pointer-events-none opacity-55")}>
          {enviando ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Camera className="size-4" aria-hidden />}
          {enviando ? "Enviando…" : "Adicionar fotos"}
          <input
            ref={entrada}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            disabled={enviando || cheio}
            onChange={(e) => enviar(Array.from(e.target.files ?? []))}
          />
        </label>
        <span className="text-sm text-tinta-suave">
          {fotos.length} de {MAXIMO_FOTOS} fotos · a primeira abre o álbum
        </span>
      </div>

      {envios.length > 0 && (
        <ul className="flex flex-col gap-2" aria-live="polite">
          {envios.map((envio, i) => (
            <li key={`${envio.nome}-${i}`} className="text-sm">
              <div className="flex justify-between gap-2">
                <span className="truncate">{envio.nome}</span>
                <span className={envio.erro ? "text-perigo" : "text-tinta-suave"}>{envio.erro ?? `${envio.progresso}%`}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden bg-papel-escuro">
                <div className={cn("h-full transition-all", envio.erro ? "bg-perigo" : "bg-tinta")} style={{ width: `${envio.erro ? 100 : envio.progresso}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {fotos.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {fotos.map((foto, i) => (
            <li key={foto.id} className="cartao">
              <div className="relative aspect-[4/3] bg-papel-escuro">
                <Image src={urlImagem(foto.url, { largura: 400, altura: 300, recorte: true })} alt={`Foto ${i + 1}`} fill sizes="200px" className="object-cover" unoptimized />
              </div>
              <div className="flex items-center justify-between p-1">
                <div className="flex">
                  <BotaoIcone rotulo="Mover para antes" onClick={() => mover(i, i - 1)} desabilitado={i === 0}>
                    <ArrowLeft className="size-4" />
                  </BotaoIcone>
                  <BotaoIcone rotulo="Mover para depois" onClick={() => mover(i, i + 1)} desabilitado={i === fotos.length - 1}>
                    <ArrowRight className="size-4" />
                  </BotaoIcone>
                </div>
                <BotaoIcone rotulo="Remover foto" onClick={() => remover(foto)} perigo>
                  <Trash2 className="size-4" />
                </BotaoIcone>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function BotaoIcone({ rotulo, onClick, desabilitado, perigo, children }: { rotulo: string; onClick: () => void; desabilitado?: boolean; perigo?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desabilitado}
      aria-label={rotulo}
      title={rotulo}
      className={cn("inline-flex size-9 items-center justify-center hover:bg-papel-escuro disabled:opacity-30", perigo && "text-perigo")}
    >
      {children}
    </button>
  )
}

/** Lado maior ≤ 1600 px em JPEG. Se o navegador não decodifica o formato (HEIC fora do Safari), envia o original. */
async function redimensionar(arquivo: File): Promise<Blob> {
  try {
    const imagem = await createImageBitmap(arquivo, { imageOrientation: "from-image" })
    const escala = Math.min(1, LADO_MAXIMO / Math.max(imagem.width, imagem.height))
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(imagem.width * escala)
    canvas.height = Math.round(imagem.height * escala)
    canvas.getContext("2d")!.drawImage(imagem, 0, 0, canvas.width, canvas.height)
    imagem.close()
    const blob = await new Promise<Blob | null>((resolver) => canvas.toBlob(resolver, "image/jpeg", QUALIDADE_JPEG))
    return blob ?? arquivo
  } catch {
    return arquivo
  }
}

type RespostaCloudinary = { secure_url: string; public_id: string }

function enviarComProgresso(assinatura: { url: string; campos: Record<string, string> }, arquivo: Blob, aoProgredir: (p: number) => void): Promise<RespostaCloudinary> {
  return new Promise((resolver, rejeitar) => {
    const dados = new FormData()
    for (const [chave, valor] of Object.entries(assinatura.campos)) dados.append(chave, valor)
    dados.append("file", arquivo)
    const xhr = new XMLHttpRequest()
    xhr.open("POST", assinatura.url)
    xhr.upload.onprogress = (e) => e.lengthComputable && aoProgredir(Math.round((e.loaded / e.total) * 95))
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolver(JSON.parse(xhr.responseText))
      else rejeitar(new Error("O serviço de fotos recusou o arquivo."))
    }
    xhr.onerror = () => rejeitar(new Error("Sem conexão. Tente de novo."))
    xhr.send(dados)
  })
}
