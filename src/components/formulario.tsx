"use client"

// APRESENTAÇÃO — formulários ligados a Server Actions, mantendo o que foi digitado quando há erro.

import { Loader2 } from "lucide-react"
import { type FormEvent, type ReactNode, useEffect, useRef, useState, useTransition } from "react"
import { toast } from "sonner"
import type { EstadoFormulario } from "@/lib/formularios"
import { cn } from "@/lib/utils"

type Acao = (formData: FormData) => Promise<EstadoFormulario>

export function useFormularioAcao(
  acao: Acao,
  opcoes: {
    aoSucesso?: (estado: NonNullable<EstadoFormulario>, form: HTMLFormElement | null) => void
    avisarSucesso?: boolean
  } = {},
) {
  const [estado, setEstado] = useState<EstadoFormulario>(null)
  const [pendente, iniciar] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  function onSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const formData = new FormData(evento.currentTarget)
    iniciar(async () => {
      const resultado = await acao(formData)
      setEstado(resultado)
      if (!resultado) return
      if (resultado.ok) {
        if (opcoes.avisarSucesso !== false && resultado.mensagem) toast.success(resultado.mensagem)
        opcoes.aoSucesso?.(resultado, formRef.current)
      } else if (!resultado.campos && resultado.mensagem) {
        toast.error(resultado.mensagem)
      }
    })
  }

  // Leva o foco ao primeiro campo com erro (acessibilidade).
  useEffect(() => {
    const primeiro = estado?.campos ? Object.keys(estado.campos)[0] : null
    if (!primeiro || !formRef.current) return
    formRef.current.querySelector<HTMLElement>(`[name="${primeiro}"]`)?.focus()
  }, [estado])

  return { estado, pendente, onSubmit, formRef, erro: (campo: string) => estado?.campos?.[campo] }
}

export function Campo({
  rotulo,
  nome,
  erro,
  dica,
  className,
  obrigatorio,
  children,
}: {
  rotulo: string
  nome: string
  erro?: string
  dica?: ReactNode
  className?: string
  obrigatorio?: boolean
  children: ReactNode
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={nome} className="rotulo">
        {rotulo}
        {obrigatorio && (
          <span className="ml-0.5 text-perigo" aria-hidden>
            *
          </span>
        )}
      </label>
      {children}
      {erro ? (
        <p id={`${nome}-erro`} role="alert" className="text-sm text-perigo">
          {erro}
        </p>
      ) : dica ? (
        <p className="text-xs text-tinta-suave">{dica}</p>
      ) : null}
    </div>
  )
}

/** Props de acessibilidade para o input dentro de <Campo>. */
export function aria(nome: string, erro?: string) {
  return { id: nome, name: nome, "aria-invalid": erro ? true : undefined, "aria-describedby": erro ? `${nome}-erro` : undefined }
}

export function BotaoEnviar({ pendente, children, className, perigo }: { pendente: boolean; children: ReactNode; className?: string; perigo?: boolean }) {
  return (
    <button type="submit" disabled={pendente} className={cn("botao", perigo && "botao-perigo", className)}>
      {pendente && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
}

export function MensagemFormulario({ estado }: { estado: EstadoFormulario }) {
  if (!estado || estado.ok || !estado.campos || !estado.mensagem) return null
  return (
    <p role="alert" className="border border-perigo bg-perigo/5 px-3 py-2 text-sm text-perigo">
      {estado.mensagem}
    </p>
  )
}
