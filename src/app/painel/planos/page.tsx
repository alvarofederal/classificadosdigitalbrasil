// APRESENTAÇÃO — tabela de preços editável (feature 003: RF-51).

import type { Metadata } from "next"
import { Faixa } from "@/components/jornal/pecas"
import { RECURSOS_DO_PLANO } from "@/domain/plano/plano"
import { container } from "@/infrastructure/container"
import { reaisParaCampo } from "@/lib/formatadores"
import { FormularioPlano } from "./formulario-plano"

export const metadata: Metadata = { title: "Planos e preços", robots: { index: false } }

export default async function Planos() {
  const planos = await container().painel.planos()
  return (
    <div className="flex flex-col gap-5">
      <Faixa como="h1">Planos e preços</Faixa>
      <p className="max-w-3xl text-sm">
        Os quatro planos são fixos; você muda nome, descrição, preço de 7 e de 30 dias, fotos e se o plano está à venda. Mudanças valem para as próximas
        cobranças: Pix já gerado mantém o valor da época. Sugestão: 30 dias = 3 semanas, para o plano mensal sair mais barato por dia.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {planos.map((plano) => (
          <FormularioPlano
            key={`${plano.codigo}-${plano.valor7DiasCentavos}-${plano.valor30DiasCentavos}-${plano.ativo}`}
            codigo={plano.codigo}
            recursos={RECURSOS_DO_PLANO[plano.codigo]}
            iniciais={{
              nome: plano.nome,
              descricao: plano.descricao,
              maxFotos: String(plano.maxFotos),
              valor7Dias: reaisParaCampo(plano.valor7DiasCentavos),
              valor30Dias: reaisParaCampo(plano.valor30DiasCentavos),
              ativo: plano.ativo,
            }}
          />
        ))}
      </div>
    </div>
  )
}
