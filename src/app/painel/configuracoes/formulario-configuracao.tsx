"use client"

import { BotaoEnviar, Campo, MensagemFormulario, aria, useFormularioAcao } from "@/components/formulario"
import { salvarConfiguracaoAction } from "../actions"

export function FormularioConfiguracao({
  iniciais,
}: {
  iniciais: { pixChave: string; pixNome: string; pixCidade: string; valorAnuncio: string; diasDePublicacao: string }
}) {
  const { estado, pendente, onSubmit, formRef, erro } = useFormularioAcao(salvarConfiguracaoAction)
  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <MensagemFormulario estado={estado} />
      <fieldset className="flex flex-col gap-4 border border-fio p-4">
        <legend className="rotulo px-1">Recebedor do Pix</legend>
        <p className="text-sm">
          Com a chave preenchida, cada anúncio mostra um QR Code com o valor e um identificador. Confira o identificador no extrato e confirme
          o pagamento na lista de anúncios.
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

      <fieldset className="flex flex-col gap-4 border border-fio p-4">
        <legend className="rotulo px-1">Preço do anúncio</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Valor (R$)" nome="valorAnuncio" erro={erro("valorAnuncio")}>
            <input {...aria("valorAnuncio", erro("valorAnuncio"))} className="campo" defaultValue={iniciais.valorAnuncio} inputMode="decimal" />
          </Campo>
          <Campo rotulo="Dias no caderno" nome="diasDePublicacao" erro={erro("diasDePublicacao")}>
            <input {...aria("diasDePublicacao", erro("diasDePublicacao"))} type="number" min={1} max={90} className="campo" defaultValue={iniciais.diasDePublicacao} />
          </Campo>
        </div>
        <p className="text-xs text-tinta-suave">Vale para as próximas cobranças. Pix já gerado mantém o valor da época.</p>
      </fieldset>

      <BotaoEnviar pendente={pendente} className="self-start">
        Salvar configuração
      </BotaoEnviar>
    </form>
  )
}
