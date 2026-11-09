"use client"

import { BotaoEnviar, Campo, MensagemFormulario, aria, useFormularioAcao } from "@/components/formulario"
import { salvarPlanoAction } from "../actions"

export function FormularioPlano({
  codigo,
  recursos,
  periodos,
  iniciais,
}: {
  codigo: string
  recursos: { prioridade: number; destaque: boolean; vitrine: boolean }
  periodos: number[]
  iniciais: { nome: string; descricao: string; maxFotos: string; precos: Record<string, string>; ativo: boolean }
}) {
  const { estado, pendente, onSubmit, formRef, erro } = useFormularioAcao(salvarPlanoAction.bind(null, codigo))
  const id = (campo: string) => `${codigo}-${campo}`
  const fixo = [`prioridade ${recursos.prioridade}`, recursos.destaque && "moldura de destaque", recursos.vitrine && "topo da seção"].filter(Boolean).join(" · ")

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
      <fieldset className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <legend className="rotulo mb-1">Preço por período (R$)</legend>
        {periodos.map((dias) => (
          <Campo key={dias} rotulo={`${dias} dias`} nome={id(`preco${dias}`)} erro={erro(`preco${dias}`)}>
            <input
              {...aria(id(`preco${dias}`), erro(`preco${dias}`))}
              name={`preco${dias}`}
              className="campo"
              defaultValue={iniciais.precos[dias] ?? ""}
              inputMode="decimal"
              placeholder="—"
            />
          </Campo>
        ))}
      </fieldset>
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
