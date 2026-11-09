"use client"

import { BotaoEnviar, useFormularioAcao } from "@/components/formulario"
import { atualizarChamadoAction } from "../actions"

export function AcoesDoChamado({ id, resolvido, notaInterna }: { id: string; resolvido: boolean; notaInterna: string | null }) {
  const { pendente, onSubmit, formRef } = useFormularioAcao(atualizarChamadoAction.bind(null, id, !resolvido))
  return (
    <form ref={formRef} onSubmit={onSubmit} className="mt-3 flex flex-col gap-2 border-t border-dotted border-tinta/60 pt-3" noValidate>
      <label htmlFor={`nota-${id}`} className="rotulo">
        Nota interna (só o admin vê)
      </label>
      <textarea id={`nota-${id}`} name="notaInterna" className="campo min-h-14 text-sm" defaultValue={notaInterna ?? ""} maxLength={2000} />
      <BotaoEnviar pendente={pendente} className="botao-pequeno self-start">
        {resolvido ? "Reabrir chamado" : "Marcar como resolvido"}
      </BotaoEnviar>
    </form>
  )
}
