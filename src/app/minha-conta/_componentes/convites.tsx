"use client"

// APRESENTAÇÃO — convidar amigos (feature 015: RF-250 a RF-252, RF-255).

import { Loader2, Mail, MessageCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"
import { BotaoEnviar, Campo, MensagemFormulario, aria, useFormularioAcao } from "@/components/formulario"
import { cancelarConviteAction, convidarPeloWhatsAppAction, convidarPorEmailAction } from "../actions"

/** RF-252: cria o convite e abre o WhatsApp de quem convida com o texto e o link. */
export function BotaoConvidarPeloWhatsApp({ desabilitado }: { desabilitado?: boolean }) {
  const router = useRouter()
  const [pendente, iniciar] = useTransition()
  return (
    <button
      type="button"
      className="botao botao-pequeno"
      disabled={pendente || desabilitado}
      onClick={() => {
        // A janela abre já no clique: aberta depois da resposta do servidor, o navegador poderia bloquear.
        const janela = window.open("", "_blank")
        iniciar(async () => {
          const r = await convidarPeloWhatsAppAction()
          if (!r.ok) {
            janela?.close()
            toast.error(r.mensagem)
            return
          }
          const url = `https://wa.me/?text=${encodeURIComponent(r.texto)}`
          if (janela) janela.location.href = url
          else window.location.href = url
          router.refresh()
        })
      }}
    >
      {pendente ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <MessageCircle className="size-4" aria-hidden />}
      Convidar pelo WhatsApp
    </button>
  )
}

/** RF-251 */
export function FormularioConviteEmail({ desabilitado }: { desabilitado?: boolean }) {
  const { estado, pendente, onSubmit, formRef, erro } = useFormularioAcao(convidarPorEmailAction, { aoSucesso: (_, form) => form?.reset() })
  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
      <MensagemFormulario estado={estado} />
      <Campo rotulo="E-mail do amigo" nome="email" erro={erro("email")}>
        <input {...aria("email", erro("email"))} type="email" className="campo" autoComplete="off" maxLength={160} disabled={desabilitado} />
      </Campo>
      <BotaoEnviar pendente={pendente} className="botao-vazado self-start">
        <Mail className="size-4" aria-hidden />
        Mandar o convite por e-mail
      </BotaoEnviar>
    </form>
  )
}

/** RF-255 */
export function BotaoCancelarConvite({ conviteId }: { conviteId: string }) {
  const router = useRouter()
  const [pendente, iniciar] = useTransition()
  return (
    <button
      type="button"
      className="text-sm underline"
      disabled={pendente}
      onClick={() =>
        iniciar(async () => {
          const r = await cancelarConviteAction(conviteId)
          if (r && !r.ok) toast.error(r.mensagem)
          else {
            toast.success(r?.mensagem ?? "Convite cancelado.")
            router.refresh()
          }
        })
      }
    >
      Cancelar
    </button>
  )
}
