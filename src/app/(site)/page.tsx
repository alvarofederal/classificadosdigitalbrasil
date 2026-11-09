// APRESENTAÇÃO — capa limpa (feature 002): busca, "perto de mim" e vitrine.
// Funcionamento, valores e contato ficam na página /como-funciona. Sem lista de seções vazias (RF-40).

import Link from "next/link"
import { AnuncioDoCaderno, Caderno } from "@/components/jornal/caderno"
import { Filtros } from "@/components/jornal/filtros"
import { PertoDeMim } from "@/components/jornal/perto-de-mim"
import { container } from "@/infrastructure/container"
import { precoInicial } from "@/lib/planos"

export default async function Capa() {
  const c = container()
  const agora = c.relogio.agora()
  const [secoes, planos, vitrine] = await Promise.all([c.classificados.categoriasAtivas(), c.classificados.planosAVenda(), c.classificados.vitrine(agora, 10)])
  const preco = precoInicial(planos)

  return (
    <div className="flex flex-col gap-10 pt-4">
      <section aria-label="Procurar anúncios" className="flex flex-col gap-4">
        <p className="max-w-3xl text-lg leading-snug sm:text-xl">
          Classificados da sua cidade, no formato do jornal. Procure por estado, cidade e seção, ou anuncie a partir de <strong>{preco}</strong>.
        </p>
        <Filtros secoes={secoes.map(({ id, nome, slug }) => ({ id, nome, slug }))} />
        <PertoDeMim />
      </section>

      {vitrine.length > 0 && (
        <section aria-labelledby="titulo-vitrine">
          <h2 id="titulo-vitrine" className="tarja-secao mb-3 text-xl sm:text-2xl">
            Vitrine
          </h2>
          <Caderno>
            {vitrine.map((anuncio) => {
              const cidade = c.localidades.cidade(anuncio.cidadeCodigo)
              return <AnuncioDoCaderno key={anuncio.id} anuncio={anuncio} mostrarCidade={cidade ? `${cidade.nome}/${cidade.uf} · ${anuncio.categoriaNome}` : undefined} />
            })}
          </Caderno>
        </section>
      )}

      <section aria-label="Saiba mais" className="grid gap-3 border-y-2 border-tinta py-5 sm:grid-cols-3">
        <Link href="/como-funciona#anunciar" className="group flex flex-col gap-1 border border-tinta p-4 hover:bg-papel-escuro">
          <span className="font-titulo text-lg font-bold uppercase group-hover:underline">Como funciona</span>
          <span className="text-sm">Como anunciar, como procurar e como divulgar o seu anúncio.</span>
        </Link>
        <Link href="/como-funciona#valores" className="group flex flex-col gap-1 border-[3px] border-double border-tinta p-4 hover:bg-papel-escuro">
          <span className="font-titulo text-lg font-bold uppercase group-hover:underline">Valores</span>
          <span className="text-sm">Planos de 7 e 30 dias, a partir de {preco}.</span>
        </Link>
        <Link href="/como-funciona#contato" className="group flex flex-col gap-1 border border-dashed border-tinta p-4 hover:bg-papel-escuro">
          <span className="font-titulo text-lg font-bold uppercase group-hover:underline">Contato</span>
          <span className="text-sm">Dúvidas, suporte, pagamento e denúncias.</span>
        </Link>
      </section>
    </div>
  )
}
