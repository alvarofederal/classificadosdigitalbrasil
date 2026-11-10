// APRESENTAÇÃO — situação do Pix automático (feature 006), do aviso por e-mail (feature 010, RF-103) e recebedor do Pix estático de reserva (RF-35).

import type { Metadata } from "next"
import { CheckCircle2, CircleDashed, XCircle } from "lucide-react"
import Link from "next/link"
import { Faixa } from "@/components/jornal/pecas"
import { container } from "@/infrastructure/container"
import { exigirPerfil } from "@/lib/sessao"
import { BotaoAcao } from "../_componentes/botao-acao"
import { enviarEmailDeTesteAction } from "../actions"
import { FormularioConfiguracao } from "./formulario-configuracao"

export const metadata: Metadata = { title: "Configurações", robots: { index: false } }

function Item({ ok, alerta, children }: { ok: boolean; alerta?: boolean; children: React.ReactNode }) {
  const Icone = ok ? CheckCircle2 : alerta ? XCircle : CircleDashed
  return (
    <li className="flex items-start gap-2">
      <Icone className={ok ? "mt-0.5 size-5 shrink-0 text-sucesso" : alerta ? "mt-0.5 size-5 shrink-0 text-perigo" : "mt-0.5 size-5 shrink-0 text-tinta-suave"} aria-hidden />
      <span>{children}</span>
    </li>
  )
}

type ContaMp = { apelido: string; id: number; producao: boolean }

/** Pergunta ao Mercado Pago de quem é o token. Erro vira texto para o painel, sem derrubar a página. */
async function conferirMercadoPago(consultar: (() => Promise<ContaMp>) | null): Promise<{ conta: ContaMp | null; erro: string | null }> {
  if (!consultar) return { conta: null, erro: null }
  try {
    return { conta: await consultar(), erro: null }
  } catch (erro) {
    return { conta: null, erro: erro instanceof Error ? erro.message : "Não foi possível falar com o Mercado Pago." }
  }
}

export default async function Configuracoes() {
  const admin = await exigirPerfil("ADMIN")
  const c = container()
  const mp = c.mercadoPago
  const correio = c.correio
  // As três conferências saem juntas: servidor de e-mail lento não soma ao tempo do Mercado Pago.
  const [cfg, { conta, erro: erroDaConta }, conexao] = await Promise.all([
    c.configuracao.obter(),
    conferirMercadoPago(mp.conta),
    correio.ligado ? correio.conferir() : Promise.resolve(null),
  ])
  const ligado = Boolean(conta?.producao)
  const emailLigado = Boolean(conexao?.ok)

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <Faixa como="h1">Configurações</Faixa>

      <section className={ligado ? "border-2 border-sucesso p-4" : "border-2 border-tinta p-4"}>
        <p className="font-titulo text-lg font-bold uppercase">Pix automático (Mercado Pago)</p>
        <ul className="mt-3 flex flex-col gap-2 text-sm">
          <Item ok={Boolean(mp.conta)}>
            Token cadastrado na Vercel (<code>MERCADO_PAGO_ACCESS_TOKEN</code>)
          </Item>
          {mp.conta && (
            <Item ok={Boolean(conta)} alerta={Boolean(erroDaConta)}>
              {conta ? (
                <>
                  Conta conectada: <strong>{conta.apelido}</strong> (ID {conta.id})
                </>
              ) : (
                <>Mercado Pago recusou o token: {erroDaConta}</>
              )}
            </Item>
          )}
          {conta && (
            <Item ok={conta.producao} alerta={!conta.producao}>
              {conta.producao ? "Credencial de produção: cobra de verdade" : "Credencial de TESTE: troque pela de produção para receber de verdade"}
            </Item>
          )}
          <Item ok={mp.temSegredoDoAviso}>
            Assinatura secreta do aviso cadastrada (<code>MERCADO_PAGO_WEBHOOK_SECRET</code>)
          </Item>
          <Item ok={Boolean(mp.urlDoAviso)}>
            Endereço do aviso (webhook) para colar no Mercado Pago:{" "}
            <code className="select-all break-all font-bold">{mp.urlDoAviso ?? "disponível depois do deploy"}</code>
          </Item>
        </ul>
        <p className="mt-3 text-sm">
          {ligado
            ? "Cada cobrança gera um Pix no Mercado Pago e o anúncio entra no ar sozinho quando o pagamento é aprovado."
            : "Enquanto não estiver tudo marcado, os anunciantes pagam pelo Pix estático abaixo e você confirma cada pagamento em Anúncios."}{" "}
          Passo a passo em <code>spec/features/006-pix-automatico</code>.
        </p>
      </section>

      <section className={emailLigado ? "border-2 border-sucesso p-4" : "border-2 border-tinta p-4"}>
        <p className="font-titulo text-lg font-bold uppercase">Aviso de mensagem por e-mail</p>
        <ul className="mt-3 flex flex-col gap-2 text-sm">
          <Item ok={correio.ligado}>
            Servidor de e-mail cadastrado na Vercel (<code>SMTP_HOST</code>, <code>SMTP_USER</code> e <code>SMTP_PASS</code>)
            {correio.faltam.length > 0 && (
              <>
                . Falta: <strong>{correio.faltam.join(", ")}</strong>
              </>
            )}
          </Item>
          {conexao && (
            <Item ok={conexao.ok} alerta={!conexao.ok}>
              {conexao.ok ? (
                <>
                  Conexão e login conferidos em <strong>{correio.servidor}</strong>
                </>
              ) : (
                conexao.mensagem
              )}
            </Item>
          )}
          {correio.remetente && (
            <Item ok>
              Remetente: <strong>{correio.remetente}</strong>
            </Item>
          )}
        </ul>
        <p className="mt-3 text-sm">
          {emailLigado
            ? "Cada mensagem recebida num anúncio vira um e-mail para o dono, com o texto e o contato de quem escreveu."
            : "Enquanto não estiver tudo marcado, as mensagens ficam só em Minha conta, sem aviso para o dono."}{" "}
          Passo a passo em <code>spec/features/010-aviso-de-mensagem</code>.
        </p>
        {correio.ligado && (
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            <BotaoAcao acao={enviarEmailDeTesteAction} rotulo="Enviar e-mail de teste" vazado />
            <span>
              O teste vai para <strong className="break-all">{admin.email}</strong>.
            </span>
          </div>
        )}
      </section>

      <FormularioConfiguracao iniciais={{ pixChave: cfg.pixChave, pixNome: cfg.pixNome, pixCidade: cfg.pixCidade }} />
      <p className="text-sm">
        Preços e planos ficam em{" "}
        <Link href="/painel/planos" className="link">
          Planos
        </Link>
        .
      </p>
    </div>
  )
}
