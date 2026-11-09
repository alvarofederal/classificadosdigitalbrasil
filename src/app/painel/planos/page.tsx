// APRESENTAÇÃO — tabela de preços editável: um valor por plano e período (features 003 e 009: RF-51, RN-56).

import type { Metadata } from "next"
import { Faixa } from "@/components/jornal/pecas"
import { PERIODOS, RECURSOS_DO_PLANO } from "@/domain/plano/plano"
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
        Um preço por período ({PERIODOS.join(", ")} dias). Deixe o campo em branco para não vender aquele período no plano. Mudanças valem para as próximas
        cobranças: Pix já gerado mantém o valor da época. Plano fora de venda some da tabela e do cadastro de anúncios.
      </p>
      <div className="grid gap-4 xl:grid-cols-2">
        {planos.map((plano) => (
          <FormularioPlano
            key={`${plano.codigo}-${JSON.stringify(plano.precos)}-${plano.ativo}-${plano.maxFotos}`}
            codigo={plano.codigo}
            recursos={RECURSOS_DO_PLANO[plano.codigo]}
            periodos={[...PERIODOS]}
            iniciais={{
              nome: plano.nome,
              descricao: plano.descricao,
              maxFotos: String(plano.maxFotos),
              precos: Object.fromEntries(PERIODOS.map((dias) => [dias, plano.precos[dias] ? reaisParaCampo(plano.precos[dias]!) : ""])),
              ativo: plano.ativo,
            }}
          />
        ))}
      </div>
    </div>
  )
}
