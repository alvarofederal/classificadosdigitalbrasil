"use client"

import type { CategoriaAdminDTO } from "@/application/queries/consultas"
import { BotaoEnviar, useFormularioAcao } from "@/components/formulario"
import { BotaoAcao } from "../_componentes/botao-acao"
import { atualizarCategoriaAction, criarCategoriaAction, removerCategoriaAction } from "../actions"

export function NovaCategoria({ proximaOrdem }: { proximaOrdem: number }) {
  const { pendente, onSubmit, formRef, erro } = useFormularioAcao(criarCategoriaAction, { aoSucesso: (_e, form) => form?.reset() })
  return (
    <form ref={formRef} onSubmit={onSubmit} className="cartao grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_7rem_auto_auto] sm:items-end" noValidate>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="nova-nome" className="rotulo">
          Nova categoria
        </label>
        <input id="nova-nome" name="nome" className="campo" maxLength={60} aria-invalid={erro("nome") ? true : undefined} />
        {erro("nome") && <p className="text-sm text-perigo">{erro("nome")}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="nova-ordem" className="rotulo">
          Ordem
        </label>
        <input id="nova-ordem" name="ordem" type="number" min={0} max={999} className="campo" defaultValue={proximaOrdem} />
      </div>
      <label className="flex min-h-11 items-center gap-2">
        <input type="checkbox" name="ativa" defaultChecked className="size-4 accent-tinta" />
        <span className="rotulo">Ativa</span>
      </label>
      <BotaoEnviar pendente={pendente}>Adicionar</BotaoEnviar>
    </form>
  )
}

export function LinhaCategoria({ categoria }: { categoria: CategoriaAdminDTO }) {
  const { pendente, onSubmit, formRef, erro } = useFormularioAcao(atualizarCategoriaAction.bind(null, categoria.id))
  return (
    <li className="border-b border-fio/30 py-2">
      <form ref={formRef} onSubmit={onSubmit} className="grid gap-2 sm:grid-cols-[5rem_minmax(0,1fr)_auto_auto_auto] sm:items-center" noValidate>
        <input name="ordem" type="number" min={0} max={999} className="campo" defaultValue={categoria.ordem} aria-label={`Ordem de ${categoria.nome}`} />
        <div>
          <input name="nome" className="campo" defaultValue={categoria.nome} maxLength={60} aria-label="Nome" aria-invalid={erro("nome") ? true : undefined} />
          {erro("nome") && <p className="text-sm text-perigo">{erro("nome")}</p>}
          <p className="mt-0.5 text-xs text-tinta-suave">
            /{categoria.slug} · {categoria.totalAnuncios} anúncio(s)
          </p>
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="ativa" defaultChecked={categoria.ativa} className="size-4 accent-tinta" />
          <span className="rotulo">Ativa</span>
        </label>
        <BotaoEnviar pendente={pendente} className="botao-pequeno">
          Salvar
        </BotaoEnviar>
        {categoria.totalAnuncios === 0 ? (
          <BotaoAcao acao={removerCategoriaAction.bind(null, categoria.id)} rotulo="Excluir" confirmacao={`Excluir a categoria ${categoria.nome}?`} perigo vazado />
        ) : (
          <span className="text-xs text-tinta-suave">Em uso</span>
        )}
      </form>
    </li>
  )
}
