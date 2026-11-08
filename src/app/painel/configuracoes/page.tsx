// APRESENTAÇÃO — recebedor do Pix e tabela de preço (RF-35).

import type { Metadata } from "next"
import { Faixa } from "@/components/jornal/pecas"
import { container } from "@/infrastructure/container"
import { reaisParaCampo } from "@/lib/formatadores"
import { FormularioConfiguracao } from "./formulario-configuracao"

export const metadata: Metadata = { title: "Configurações", robots: { index: false } }

export default async function Configuracoes() {
  const cfg = await container().configuracao.obter()
  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <Faixa como="h1">Configurações</Faixa>
      <FormularioConfiguracao
        iniciais={{
          pixChave: cfg.pixChave,
          pixNome: cfg.pixNome,
          pixCidade: cfg.pixCidade,
          valorAnuncio: reaisParaCampo(cfg.valorAnuncioCentavos),
          diasDePublicacao: String(cfg.diasDePublicacao),
        }}
      />
    </div>
  )
}
