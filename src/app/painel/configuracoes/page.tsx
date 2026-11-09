// APRESENTAÇÃO — recebedor do Pix estático (reserva) e situação do Pix automático (RF-35, feature 006).

import type { Metadata } from "next"
import Link from "next/link"
import { Faixa } from "@/components/jornal/pecas"
import { container } from "@/infrastructure/container"
import { FormularioConfiguracao } from "./formulario-configuracao"

export const metadata: Metadata = { title: "Configurações", robots: { index: false } }

export default async function Configuracoes() {
  const c = container()
  const cfg = await c.configuracao.obter()
  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <Faixa como="h1">Configurações</Faixa>

      <section className={c.pixAutomatico ? "border-2 border-sucesso p-4" : "border-2 border-perigo p-4"}>
        <p className="font-titulo text-lg font-bold uppercase">{c.pixAutomatico ? "Pix automático ligado (Mercado Pago)" : "Pix automático desligado"}</p>
        {c.pixAutomatico ? (
          <p className="mt-1 text-sm">Cada cobrança gera um Pix no Mercado Pago e o anúncio entra no ar sozinho quando o pagamento é aprovado.</p>
        ) : (
          <div className="mt-1 flex flex-col gap-1 text-sm">
            <p>Sem as credenciais, os anunciantes pagam pelo Pix estático abaixo e você confirma cada pagamento em Anúncios.</p>
            <p>
              Para ligar, cadastre na Vercel (Production) <code>MERCADO_PAGO_ACCESS_TOKEN</code> e <code>MERCADO_PAGO_WEBHOOK_SECRET</code> e configure o webhook do
              Mercado Pago para <code>/api/pagamentos/mercadopago</code>. Passo a passo em <code>spec/features/006-pix-automatico</code>.
            </p>
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
