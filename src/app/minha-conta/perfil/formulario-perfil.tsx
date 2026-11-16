"use client"

import { BotaoEnviar, Campo, MensagemFormulario, aria, useFormularioAcao } from "@/components/formulario"
import { SeletorLocalidade } from "@/components/seletor-localidade"
import { CampoDoCodigo } from "../../(acesso)/formularios-acesso"
import { atualizarPerfilAction, cancelarTrocaDeEmailAction, confirmarTrocaDeEmailAction, pedirTrocaDeEmailAction } from "../actions"

export function FormularioPerfil({ iniciais }: { iniciais: { nome: string; celular: string; uf: string; cidadeCodigo: number } }) {
  const { estado, pendente, onSubmit, formRef, erro } = useFormularioAcao(atualizarPerfilAction)
  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <MensagemFormulario estado={estado} />
      <Campo rotulo="Nome completo" nome="nome" erro={erro("nome")} obrigatorio>
        <input {...aria("nome", erro("nome"))} className="campo" defaultValue={iniciais.nome} autoComplete="name" maxLength={120} />
      </Campo>
      <Campo rotulo="Celular" nome="celular" erro={erro("celular")} obrigatorio className="sm:max-w-xs">
        <input {...aria("celular", erro("celular"))} className="campo" defaultValue={iniciais.celular} inputMode="tel" maxLength={16} />
      </Campo>
      <SeletorLocalidade ufInicial={iniciais.uf} cidadeInicial={iniciais.cidadeCodigo} erroUf={erro("uf")} erroCidade={erro("cidadeCodigo")} obrigatorio />
      <BotaoEnviar pendente={pendente} className="self-start">
        Salvar dados
      </BotaoEnviar>
    </form>
  )
}

/** RF-154: o e-mail novo só vale depois do código mandado para ele. */
export function TrocaDeEmail({ email, emailNovoPendente }: { email: string; emailNovoPendente: string | null }) {
  const pedir = useFormularioAcao(pedirTrocaDeEmailAction, { aoSucesso: (_, form) => form?.reset() })
  const confirmar = useFormularioAcao(confirmarTrocaDeEmailAction, { aoSucesso: (_, form) => form?.reset() })
  const cancelar = useFormularioAcao(cancelarTrocaDeEmailAction)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm">
        E-mail da conta: <strong className="break-all">{email}</strong>. É para ele que vão os avisos de mensagem e de vencimento.
      </p>

      {emailNovoPendente ? (
        <div className="flex flex-col gap-3 border border-tinta p-3">
          <p className="text-sm">
            Mandamos um código para <strong className="break-all">{emailNovoPendente}</strong>. O e-mail só muda depois que você digitar o código.
          </p>
          <form ref={confirmar.formRef} onSubmit={confirmar.onSubmit} className="flex flex-col gap-3" noValidate>
            <MensagemFormulario estado={confirmar.estado} />
            <CampoDoCodigo erro={confirmar.erro("codigo")} />
            <BotaoEnviar pendente={confirmar.pendente} className="self-start">
              Confirmar e-mail novo
            </BotaoEnviar>
          </form>
          <form ref={cancelar.formRef} onSubmit={cancelar.onSubmit}>
            <button type="submit" disabled={cancelar.pendente} className="text-sm underline">
              Cancelar a troca
            </button>
          </form>
        </div>
      ) : (
        <form ref={pedir.formRef} onSubmit={pedir.onSubmit} className="flex flex-col gap-3" noValidate>
          <MensagemFormulario estado={pedir.estado} />
          <Campo rotulo="E-mail novo" nome="emailNovo" erro={pedir.erro("emailNovo")}>
            <input {...aria("emailNovo", pedir.erro("emailNovo"))} type="email" className="campo" autoComplete="email" maxLength={160} />
          </Campo>
          <BotaoEnviar pendente={pedir.pendente} className="botao-vazado self-start">
            Mandar código para o e-mail novo
          </BotaoEnviar>
        </form>
      )}
    </div>
  )
}
