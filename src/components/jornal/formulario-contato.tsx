"use client"

// APRESENTAÇÃO — formulário de contato com o administrador (feature 004: RF-60 a RF-62).

import { useState } from "react"
import { BotaoEnviar, Campo, MensagemFormulario, aria, useFormularioAcao } from "@/components/formulario"
import { ASSUNTOS, type Assunto, LIMITES_DO_CHAMADO } from "@/domain/chamado/chamado"
import { abrirChamadoAction } from "@/app/(site)/actions"

export function FormularioContato({ assuntoInicial = "DUVIDA", anuncioCodigo = "" }: { assuntoInicial?: Assunto; anuncioCodigo?: string }) {
  const [protocolo, setProtocolo] = useState<string | null>(null)
  const { estado, pendente, onSubmit, formRef, erro } = useFormularioAcao(abrirChamadoAction, {
    avisarSucesso: false,
    aoSucesso: (resultado) => setProtocolo((resultado as { protocolo?: string }).protocolo ?? ""),
  })

  if (protocolo !== null) {
    return (
      <div className="border-2 border-tinta p-4">
        <p className="font-titulo text-lg font-bold uppercase">Mensagem recebida</p>
        <p className="mt-1">
          Protocolo <strong className="font-mono">{protocolo}</strong>. A resposta vai para o e-mail que você informou.
        </p>
        <button type="button" className="botao botao-vazado botao-pequeno mt-3" onClick={() => setProtocolo(null)}>
          Enviar outra mensagem
        </button>
      </div>
    )
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2" noValidate>
      <div className="sm:col-span-2">
        <MensagemFormulario estado={estado} />
      </div>
      <Campo rotulo="Seu nome" nome="nome" erro={erro("nome")} obrigatorio>
        <input {...aria("nome", erro("nome"))} className="campo" autoComplete="name" maxLength={80} />
      </Campo>
      <Campo rotulo="E-mail para a resposta" nome="email" erro={erro("email")} obrigatorio>
        <input {...aria("email", erro("email"))} type="email" className="campo" autoComplete="email" maxLength={160} />
      </Campo>
      <Campo rotulo="Telefone (opcional)" nome="telefone" erro={erro("telefone")}>
        <input {...aria("telefone", erro("telefone"))} className="campo" inputMode="tel" autoComplete="tel" maxLength={20} />
      </Campo>
      <Campo rotulo="Assunto" nome="assunto" erro={erro("assunto")} obrigatorio>
        <select {...aria("assunto", erro("assunto"))} className="campo" defaultValue={assuntoInicial}>
          {(Object.keys(ASSUNTOS) as Assunto[]).map((a) => (
            <option key={a} value={a}>
              {ASSUNTOS[a]}
            </option>
          ))}
        </select>
      </Campo>
      <Campo rotulo="Código do anúncio (se for sobre um)" nome="anuncioCodigo" erro={erro("anuncioCodigo")} className="sm:col-span-2">
        <input {...aria("anuncioCodigo", erro("anuncioCodigo"))} className="campo uppercase" defaultValue={anuncioCodigo} maxLength={6} placeholder="Ex.: 9TTTMQ" />
      </Campo>
      <Campo rotulo="Mensagem" nome="mensagem" erro={erro("mensagem")} obrigatorio className="sm:col-span-2">
        <textarea {...aria("mensagem", erro("mensagem"))} className="campo min-h-28" maxLength={LIMITES_DO_CHAMADO.mensagemMax} />
      </Campo>
      <div className="absolute -left-[9999px]" aria-hidden>
        <label htmlFor="contato-site">Site</label>
        <input id="contato-site" name="site" tabIndex={-1} autoComplete="off" />
      </div>
      <BotaoEnviar pendente={pendente} className="justify-self-start">
        Enviar mensagem
      </BotaoEnviar>
    </form>
  )
}
