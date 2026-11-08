"use client"

// APRESENTAÇÃO — o rodapé do quadrado: ícone de conversa (modal de mensagem) e ícone de álbum (fotos) — RF-17, RF-18.

import { ChevronLeft, ChevronRight, Images, MessageSquare } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { BotaoEnviar, Campo, MensagemFormulario, aria, useFormularioAcao } from "@/components/formulario"
import { Modal } from "@/components/modal"
import { LIMITES_DA_MENSAGEM } from "@/domain/mensagem/mensagem"
import { urlImagem } from "@/lib/imagens"
import { cn } from "@/lib/utils"
import { enviarMensagemAction } from "@/app/(site)/actions"

export interface AnuncioDoRodape {
  id: string
  codigo: string
  titulo: string
  fotos: Array<{ id: string; url: string }>
}

export function AcoesAnuncio({ anuncio, mostrarCodigo = true }: { anuncio: AnuncioDoRodape; mostrarCodigo?: boolean }) {
  const [mensagemAberta, setMensagemAberta] = useState(false)
  const [albumAberto, setAlbumAberto] = useState(false)

  return (
    <div className="flex items-center justify-between gap-2">
      <button
        type="button"
        onClick={() => setMensagemAberta(true)}
        className="inline-flex min-h-9 items-center gap-1.5 px-1 font-titulo text-xs font-semibold uppercase tracking-wide hover:bg-papel-escuro"
        aria-label={`Enviar mensagem para o anunciante de ${anuncio.titulo}`}
      >
        <MessageSquare className="size-4" aria-hidden />
        Mensagem
      </button>
      {mostrarCodigo && (
        <Link href={`/anuncio/${anuncio.codigo}`} className="font-titulo text-[0.65rem] uppercase tracking-wider text-tinta-suave hover:underline">
          Cód. {anuncio.codigo}
        </Link>
      )}
      {anuncio.fotos.length > 0 ? (
        <button
          type="button"
          onClick={() => setAlbumAberto(true)}
          className="inline-flex min-h-9 items-center gap-1 px-1 font-titulo text-xs font-semibold hover:bg-papel-escuro"
          aria-label={`Ver ${anuncio.fotos.length} foto(s) de ${anuncio.titulo}`}
        >
          <Images className="size-4" aria-hidden />
          {anuncio.fotos.length}
        </button>
      ) : (
        <span className="w-9" aria-hidden />
      )}

      <ModalMensagem anuncio={anuncio} aberto={mensagemAberta} aoMudar={setMensagemAberta} />
      {anuncio.fotos.length > 0 && <ModalAlbum anuncio={anuncio} aberto={albumAberto} aoMudar={setAlbumAberto} />}
    </div>
  )
}

function ModalMensagem({ anuncio, aberto, aoMudar }: { anuncio: AnuncioDoRodape; aberto: boolean; aoMudar: (v: boolean) => void }) {
  const [enviada, setEnviada] = useState(false)
  const { estado, pendente, onSubmit, formRef, erro } = useFormularioAcao(enviarMensagemAction.bind(null, anuncio.id), {
    avisarSucesso: false,
    aoSucesso: () => setEnviada(true),
  })

  function mudar(v: boolean) {
    aoMudar(v)
    if (!v) setTimeout(() => setEnviada(false), 200)
  }

  return (
    <Modal aberto={aberto} aoMudar={mudar} titulo="Mensagem ao anunciante" descricao={anuncio.titulo}>
      {enviada ? (
        <div className="flex flex-col gap-4">
          <p>Mensagem enviada. O anunciante vai responder pelo contato que você informou.</p>
          <button type="button" className="botao self-start" onClick={() => mudar(false)}>
            Fechar
          </button>
        </div>
      ) : (
        <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
          <MensagemFormulario estado={estado} />
          <Campo rotulo="Seu nome" nome="nome" erro={erro("nome")} obrigatorio>
            <input {...aria("nome", erro("nome"))} className="campo" autoComplete="name" maxLength={LIMITES_DA_MENSAGEM.nomeMax} />
          </Campo>
          <Campo rotulo="Telefone ou e-mail" nome="contato" erro={erro("contato")} obrigatorio dica="É por aqui que o anunciante vai responder.">
            <input {...aria("contato", erro("contato"))} className="campo" autoComplete="tel" maxLength={LIMITES_DA_MENSAGEM.contatoMax} />
          </Campo>
          <Campo rotulo="Mensagem" nome="texto" erro={erro("texto")} obrigatorio>
            <textarea
              {...aria("texto", erro("texto"))}
              className="campo min-h-28"
              maxLength={LIMITES_DA_MENSAGEM.textoMax}
              defaultValue={`Olá! Vi seu anúncio "${anuncio.titulo}" no Classificados Digitais do Brasil. Ainda está disponível?`}
            />
          </Campo>
          {/* Campo-isca: invisível para pessoas; robôs preenchem e a mensagem é descartada. */}
          <div className="absolute -left-[9999px]" aria-hidden>
            <label htmlFor="site">Site</label>
            <input id="site" name="site" tabIndex={-1} autoComplete="off" />
          </div>
          <BotaoEnviar pendente={pendente} className="self-start">
            Enviar mensagem
          </BotaoEnviar>
        </form>
      )}
    </Modal>
  )
}

function ModalAlbum({ anuncio, aberto, aoMudar }: { anuncio: AnuncioDoRodape; aberto: boolean; aoMudar: (v: boolean) => void }) {
  const [indice, setIndice] = useState(0)
  const total = anuncio.fotos.length
  const foto = anuncio.fotos[Math.min(indice, total - 1)]

  return (
    <Modal aberto={aberto} aoMudar={aoMudar} titulo="Álbum de fotos" descricao={`${anuncio.titulo} · ${indice + 1} de ${total}`} largura="max-w-3xl">
      <div className="flex flex-col gap-3">
        <div className="relative aspect-[4/3] w-full bg-papel-escuro">
          <Image src={urlImagem(foto.url, { largura: 1200 })} alt={`Foto ${indice + 1} de ${anuncio.titulo}`} fill sizes="(max-width: 768px) 100vw, 768px" className="object-contain" unoptimized />
          {total > 1 && (
            <>
              <button
                type="button"
                onClick={() => setIndice((i) => (i - 1 + total) % total)}
                className="absolute left-1 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center bg-tinta/80 text-papel"
                aria-label="Foto anterior"
              >
                <ChevronLeft className="size-6" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setIndice((i) => (i + 1) % total)}
                className="absolute right-1 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center bg-tinta/80 text-papel"
                aria-label="Próxima foto"
              >
                <ChevronRight className="size-6" aria-hidden />
              </button>
            </>
          )}
        </div>
        {total > 1 && (
          <div className="grid grid-cols-6 gap-1.5">
            {anuncio.fotos.map((f, i) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setIndice(i)}
                className={cn("relative aspect-square border-2", i === indice ? "border-tinta" : "border-transparent opacity-70")}
                aria-label={`Ver foto ${i + 1}`}
              >
                <Image src={urlImagem(f.url, { largura: 160, altura: 160, recorte: true })} alt="" fill sizes="80px" className="object-cover" unoptimized />
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
