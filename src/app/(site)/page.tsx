// APRESENTAÇÃO — capa: filtros logo abaixo do título e a página do caderno com todas as seções (RF-04).
// Sem cidade escolhida não há consulta de anúncios (RNF-01): cada seção mostra o convite para anunciar.

import Link from "next/link"
import { Fragment } from "react"
import { AnuncioDaCasa, Caderno, RodapeDaCasa, TarjaSecao, estiloDaCasa } from "@/components/jornal/caderno"
import { CaixaAnuncio } from "@/components/jornal/caixa-anuncio"
import { Filtros } from "@/components/jornal/filtros"
import { container } from "@/infrastructure/container"
import { formatarReais, plural } from "@/lib/formatadores"
import { chamadaDaSecao, descricaoDaSecao } from "@/lib/secoes"
import { caminhoDaCidade } from "@/lib/site"

export default async function Capa() {
  const c = container()
  const agora = c.relogio.agora()
  const [secoes, cidades, tabela] = await Promise.all([
    c.classificados.categoriasAtivas(),
    c.classificados.cidadesComAnuncios(agora, 15),
    c.configuracao.obter(),
  ])
  const preco = `${formatarReais(tabela.valorAnuncioCentavos)} por ${plural(tabela.diasDePublicacao, "dia", "dias")}`

  return (
    <div className="pt-3">
      <section aria-label="Procurar anúncios" className="border-b-2 border-tinta pb-3">
        <Filtros secoes={secoes.map(({ id, nome, slug }) => ({ id, nome, slug }))} />
      </section>

      <Caderno className="mt-3">
        <AnuncioDaCasa
          href="/minha-conta/anuncios/novo"
          conteudo={{
            titulo: "Anuncie aqui",
            texto: `Seu anúncio no caderno da sua cidade: ${preco}. Escreva, escolha a moldura e pague por Pix.`,
            precoCentavos: null,
            estilo: { moldura: "DUPLA", estiloTitulo: "TARJA", alinhamento: "CENTRO", estrelas: true },
          }}
        />
        <CaixaAnuncio
          conteudo={{
            titulo: "Como funciona",
            texto: "1. Crie sua conta.\n2. Monte o anúncio vendo a prévia.\n3. Pague o Pix.\n4. O anúncio entra no caderno da cidade e as mensagens chegam na sua conta.",
            precoCentavos: null,
            estilo: { moldura: "SIMPLES", estiloTitulo: "SUBLINHADO", alinhamento: "ESQUERDA", estrelas: false },
          }}
        />

        {cidades.length > 0 && (
          <div>
            <TarjaSecao>Cidades no caderno</TarjaSecao>
            <ul className="border border-t-0 border-tinta px-2 py-1.5 text-[0.74rem] leading-[1.45]">
              {cidades.map((item) => {
                const cidade = c.localidades.cidade(item.cidadeCodigo)
                if (!cidade) return null
                return (
                  <li key={cidade.codigo} className="flex justify-between gap-2">
                    <Link href={caminhoDaCidade(cidade)} className="hover:underline">
                      {cidade.nome}/{cidade.uf}
                    </Link>
                    <span className="font-titulo">{item.total}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {secoes.map((secao, i) => (
          <Fragment key={secao.id}>
            {/* Tarja e primeiro anúncio juntos: a seção nunca fica com o título sozinho no pé da coluna. */}
            <div>
              <TarjaSecao>{secao.nome}</TarjaSecao>
              <AnuncioDaCasa
                href="/minha-conta/anuncios/novo"
                conteudo={{
                  titulo: chamadaDaSecao(secao.slug, secao.nome),
                  texto: descricaoDaSecao(secao.slug),
                  precoCentavos: null,
                  estilo: estiloDaCasa(i),
                }}
                rodape={<RodapeDaCasa preco={preco} />}
              />
            </div>
          </Fragment>
        ))}

        <CaixaAnuncio
          conteudo={{
            titulo: "Para quem procura",
            texto: "Cada anúncio tem o ícone de mensagem para falar com o anunciante e, quando há fotos, o ícone do álbum. Não precisa de cadastro para mandar mensagem.",
            precoCentavos: null,
            estilo: { moldura: "TRACEJADA", estiloTitulo: "NEGRITO", alinhamento: "ESQUERDA", estrelas: false },
          }}
        />
      </Caderno>
    </div>
  )
}
