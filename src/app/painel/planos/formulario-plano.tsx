"use client"

import { BotaoEnviar, Campo, MensagemFormulario, aria, useFormularioAcao } from "@/components/formulario"
import { salvarPlanoAction } from "../actions"

export function FormularioPlano({
  codigo,
  recursos,
  iniciais,
}: {
  codigo: string
  recursos: { prioridade: number; destaque: boolean; vitrine: boolean }
  iniciais: { nome: string; descricao: string; maxFotos: string; valor7Dias: string; valor30Dias: string; ativo: boolean }
}) {
  const { estado, pendente, onSubmit, formRef, erro } = useFormularioAcao(salvarPlanoAction.bind(null, codigo))
  const id = (campo: string) => `${codigo}-${campo}`
  const fixo = [`prioridade ${recursos.prioridade}`, recursos.destaque && "moldura de destaque", recursos.vitrine && "vitrine da capa"].filter(Boolean).join(" · ")

  return (
    <form ref={formRef} onSubmit={onSubmit} className={recursos.destaque ? "flex flex-col gap-3 border-[3px] border-double border-tinta p-4" : "flex flex-col gap-3 border border-tinta p-4"} noValidate>
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-mono text-xs">{codigo}</p>
        <p className="text-xs text-tinta-suave">Fixo: {fixo}</p>
      </div>
      <MensagemFormulario estado={estado} />
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem]">
        <Campo rotulo="Nome" nome={id("nome")} erro={erro("nome")}>
          <input {...aria(id("nome"), erro("nome"))} name="nome" className="campo" defaultValue={iniciais.nome} maxLength={40} />
        </Campo>
        <Campo rotulo="Fotos" nome={id("maxFotos")} erro={erro("maxFotos")}>
          <input {...aria(id("maxFotos"), erro("maxFotos"))} name="maxFotos" type="number" min={0} max={6} className="campo" defaultValue={iniciais.maxFotos} />
        </Campo>
      </div>
      <Campo rotulo="Descrição" nome={id("descricao")} erro={erro("descricao")}>
        <textarea {...aria(id("descricao"), erro("descricao"))} name="descricao" className="campo min-h-16" defaultValue={iniciais.descricao} maxLength={200} />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="7 dias (R$)" nome={id("valor7Dias")} erro={erro("valor7Dias")}>
          <input {...aria(id("valor7Dias"), erro("valor7Dias"))} name="valor7Dias" className="campo" defaultValue={iniciais.valor7Dias} inputMode="decimal" />
        </Campo>
        <Campo rotulo="30 dias (R$)" nome={id("valor30Dias")} erro={erro("valor30Dias")}>
          <input {...aria(id("valor30Dias"), erro("valor30Dias"))} name="valor30Dias" className="campo" defaultValue={iniciais.valor30Dias} inputMode="decimal" />
        </Campo>
      </div>
      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="ativo" defaultChecked={iniciais.ativo} className="size-4 accent-tinta" />
          <span className="rotulo">À venda</span>
        </label>
        <BotaoEnviar pendente={pendente} className="botao-pequeno">
          Salvar
        </BotaoEnviar>
      </div>
    </form>
  )
}
