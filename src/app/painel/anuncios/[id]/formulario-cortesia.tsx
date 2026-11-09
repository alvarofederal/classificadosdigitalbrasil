"use client"

import { BotaoEnviar, Campo, MensagemFormulario, aria, useFormularioAcao } from "@/components/formulario"
import { publicarCortesiaAction } from "../../actions"

export function FormularioCortesia({ anuncioId, planos, planoAtual }: { anuncioId: string; planos: Array<{ codigo: string; nome: string }>; planoAtual: string }) {
  const { estado, pendente, onSubmit, formRef, erro } = useFormularioAcao(publicarCortesiaAction.bind(null, anuncioId))
  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-wrap items-end gap-3" noValidate>
      <MensagemFormulario estado={estado} />
      <Campo rotulo="Plano" nome="planoCodigo" erro={erro("planoCodigo")}>
        <select {...aria("planoCodigo", erro("planoCodigo"))} className="campo" defaultValue={planoAtual}>
          {planos.map((p) => (
            <option key={p.codigo} value={p.codigo}>
              {p.nome}
            </option>
          ))}
        </select>
      </Campo>
      <Campo rotulo="Dias" nome="dias" erro={erro("dias")}>
        <input {...aria("dias", erro("dias"))} type="number" min={1} max={365} defaultValue={30} className="campo w-24" />
      </Campo>
      <BotaoEnviar pendente={pendente}>Publicar</BotaoEnviar>
    </form>
  )
}
