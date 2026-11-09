"use client"

import { BotaoEnviar, Campo, MensagemFormulario, aria, useFormularioAcao } from "@/components/formulario"
import { salvarConfiguracaoAction } from "../actions"

export function FormularioConfiguracao({ iniciais }: { iniciais: { pixChave: string; pixNome: string; pixCidade: string } }) {
  const { estado, pendente, onSubmit, formRef, erro } = useFormularioAcao(salvarConfiguracaoAction)
  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <MensagemFormulario estado={estado} />
      <fieldset className="flex flex-col gap-4 border border-fio p-4">
        <legend className="rotulo px-1">Pix estático (reserva)</legend>
        <p className="text-sm">
          Usado quando o Pix automático está desligado ou fora do ar: o QR Code sai com o valor e um identificador. Confira o identificador no extrato e
          confirme o pagamento em Anúncios.
        </p>
        <Campo
          rotulo="Chave Pix"
          nome="pixChave"
          erro={erro("pixChave")}
          dica="CPF ou CNPJ só com números, celular no formato +5561999999999, e-mail ou chave aleatória."
        >
          <input {...aria("pixChave", erro("pixChave"))} className="campo" defaultValue={iniciais.pixChave} maxLength={77} autoComplete="off" />
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Nome do recebedor" nome="pixNome" erro={erro("pixNome")} dica="Até 25 letras, como no banco.">
            <input {...aria("pixNome", erro("pixNome"))} className="campo" defaultValue={iniciais.pixNome} maxLength={25} />
          </Campo>
          <Campo rotulo="Cidade do recebedor" nome="pixCidade" erro={erro("pixCidade")} dica="Até 15 letras.">
            <input {...aria("pixCidade", erro("pixCidade"))} className="campo" defaultValue={iniciais.pixCidade} maxLength={15} />
          </Campo>
        </div>
      </fieldset>
      <BotaoEnviar pendente={pendente} className="self-start">
        Salvar configuração
      </BotaoEnviar>
    </form>
  )
}
