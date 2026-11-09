// APRESENTAÇÃO — situação do Pix automático (feature 006) e recebedor do Pix estático de reserva (RF-35).

import type { Metadata } from "next"
import { CheckCircle2, CircleDashed, XCircle } from "lucide-react"
import Link from "next/link"
import { Faixa } from "@/components/jornal/pecas"
import { container } from "@/infrastructure/container"
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

export default async function Configuracoes() {
  const c = container()
  const cfg = await c.configuracao.obter()
  const mp = c.mercadoPago
  let conta: { apelido: string; id: number; producao: boolean } | null = null
  let erroDaConta: string | null = null
  if (mp.conta) {
    try {
      conta = await mp.conta()
    } catch (erro) {
      erroDaConta = erro instanceof Error ? erro.message : "Não foi possível falar com o Mercado Pago."
    }
  }
  const ligado = Boolean(conta?.producao)

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
              {conta.producao ? "Credencial de produção (APP_USR-…): cobra de verdade" : "Credencial de TESTE: troque pela de produção para receber de verdade"}
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
