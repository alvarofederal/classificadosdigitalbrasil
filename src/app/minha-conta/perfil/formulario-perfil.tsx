"use client"

import { BotaoEnviar, Campo, MensagemFormulario, aria, useFormularioAcao } from "@/components/formulario"
import { SeletorLocalidade } from "@/components/seletor-localidade"
import { atualizarPerfilAction } from "../actions"

export function FormularioPerfil({ iniciais }: { iniciais: { nome: string; email: string; celular: string; uf: string; cidadeCodigo: number } }) {
  const { estado, pendente, onSubmit, formRef, erro } = useFormularioAcao(atualizarPerfilAction)
  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <MensagemFormulario estado={estado} />
      <Campo rotulo="Nome completo" nome="nome" erro={erro("nome")} obrigatorio>
        <input {...aria("nome", erro("nome"))} className="campo" defaultValue={iniciais.nome} autoComplete="name" maxLength={120} />
      </Campo>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="E-mail" nome="email" erro={erro("email")} obrigatorio>
          <input {...aria("email", erro("email"))} type="email" className="campo" defaultValue={iniciais.email} autoComplete="email" maxLength={160} />
        </Campo>
        <Campo rotulo="Celular" nome="celular" erro={erro("celular")} obrigatorio>
          <input {...aria("celular", erro("celular"))} className="campo" defaultValue={iniciais.celular} inputMode="tel" maxLength={16} />
        </Campo>
      </div>
      <SeletorLocalidade ufInicial={iniciais.uf} cidadeInicial={iniciais.cidadeCodigo} erroUf={erro("uf")} erroCidade={erro("cidadeCodigo")} obrigatorio />
      <BotaoEnviar pendente={pendente} className="self-start">
        Salvar dados
      </BotaoEnviar>
    </form>
  )
}
