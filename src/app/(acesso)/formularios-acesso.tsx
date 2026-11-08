"use client"

// APRESENTAÇÃO — formulários de entrar, criar conta e trocar senha.

import Link from "next/link"
import { BotaoEnviar, Campo, MensagemFormulario, aria, useFormularioAcao } from "@/components/formulario"
import { SeletorLocalidade } from "@/components/seletor-localidade"
import { SENHA_MINIMA } from "@/domain/usuario/usuario"
import { cadastrarAction, entrarAction, trocarSenhaAction } from "./actions"

export function FormularioEntrar({ voltar }: { voltar?: string }) {
  const { estado, pendente, onSubmit, formRef, erro } = useFormularioAcao(entrarAction)
  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <MensagemFormulario estado={estado} />
      {voltar && <input type="hidden" name="voltar" value={voltar} />}
      <Campo rotulo="E-mail" nome="email" erro={erro("email")}>
        <input {...aria("email", erro("email"))} type="email" className="campo" autoComplete="email" required />
      </Campo>
      <Campo rotulo="Senha" nome="senha" erro={erro("senha")}>
        <input {...aria("senha", erro("senha"))} type="password" className="campo" autoComplete="current-password" required />
      </Campo>
      <BotaoEnviar pendente={pendente}>Entrar</BotaoEnviar>
    </form>
  )
}

export function FormularioCadastro({ voltar }: { voltar?: string }) {
  const { estado, pendente, onSubmit, formRef, erro } = useFormularioAcao(cadastrarAction)
  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <MensagemFormulario estado={estado} />
      {voltar && <input type="hidden" name="voltar" value={voltar} />}
      <Campo rotulo="Nome completo" nome="nome" erro={erro("nome")} obrigatorio>
        <input {...aria("nome", erro("nome"))} className="campo" autoComplete="name" maxLength={120} />
      </Campo>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="CPF" nome="cpf" erro={erro("cpf")} obrigatorio dica="Não aparece no anúncio.">
          <input {...aria("cpf", erro("cpf"))} className="campo" inputMode="numeric" placeholder="000.000.000-00" maxLength={14} />
        </Campo>
        <Campo rotulo="Celular" nome="celular" erro={erro("celular")} obrigatorio>
          <input {...aria("celular", erro("celular"))} className="campo" inputMode="tel" autoComplete="tel-national" placeholder="(61) 99999-9999" maxLength={16} />
        </Campo>
      </div>
      <Campo rotulo="E-mail" nome="email" erro={erro("email")} obrigatorio>
        <input {...aria("email", erro("email"))} type="email" className="campo" autoComplete="email" maxLength={160} />
      </Campo>
      <SeletorLocalidade erroUf={erro("uf")} erroCidade={erro("cidadeCodigo")} obrigatorio rotuloCidade="Sua cidade" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Senha" nome="senha" erro={erro("senha")} obrigatorio dica={`Mínimo de ${SENHA_MINIMA} caracteres.`}>
          <input {...aria("senha", erro("senha"))} type="password" className="campo" autoComplete="new-password" />
        </Campo>
        <Campo rotulo="Repita a senha" nome="confirmacaoSenha" erro={erro("confirmacaoSenha")} obrigatorio>
          <input {...aria("confirmacaoSenha", erro("confirmacaoSenha"))} type="password" className="campo" autoComplete="new-password" />
        </Campo>
      </div>
      <div className="flex flex-col gap-1">
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="aceitouTermos" className="mt-1 size-4 accent-tinta" aria-invalid={erro("aceitouTermos") ? true : undefined} />
          <span>
            Li e aceito os{" "}
            <Link href="/termos" target="_blank" className="link">
              termos de uso e a política de privacidade
            </Link>
            .
          </span>
        </label>
        {erro("aceitouTermos") && (
          <p role="alert" className="text-sm text-perigo">
            {erro("aceitouTermos")}
          </p>
        )}
      </div>
      <BotaoEnviar pendente={pendente}>Criar conta</BotaoEnviar>
    </form>
  )
}

export function FormularioTrocarSenha({ obrigatoria }: { obrigatoria?: boolean }) {
  const { estado, pendente, onSubmit, formRef, erro } = useFormularioAcao(trocarSenhaAction)
  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {obrigatoria && <p className="border border-tinta bg-papel-escuro px-3 py-2 text-sm">Primeiro acesso: troque a senha provisória para continuar.</p>}
      <MensagemFormulario estado={estado} />
      <Campo rotulo="Senha atual" nome="senhaAtual" erro={erro("senhaAtual")}>
        <input {...aria("senhaAtual", erro("senhaAtual"))} type="password" className="campo" autoComplete="current-password" />
      </Campo>
      <Campo rotulo="Nova senha" nome="novaSenha" erro={erro("novaSenha")} dica={`Mínimo de ${SENHA_MINIMA} caracteres.`}>
        <input {...aria("novaSenha", erro("novaSenha"))} type="password" className="campo" autoComplete="new-password" />
      </Campo>
      <Campo rotulo="Repita a nova senha" nome="confirmacaoSenha" erro={erro("confirmacaoSenha")}>
        <input {...aria("confirmacaoSenha", erro("confirmacaoSenha"))} type="password" className="campo" autoComplete="new-password" />
      </Campo>
      <BotaoEnviar pendente={pendente}>Salvar nova senha</BotaoEnviar>
    </form>
  )
}
