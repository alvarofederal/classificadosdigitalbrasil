// APRESENTAÇÃO — capa: filtros logo abaixo do título e o caderno explicado em quadrados (RF-04).

import Link from "next/link"
import { CaixaAnuncio } from "@/components/jornal/caixa-anuncio"
import { Filtros } from "@/components/jornal/filtros"
import { Faixa } from "@/components/jornal/pecas"
import { container } from "@/infrastructure/container"
import { formatarReais, plural } from "@/lib/formatadores"
import { caminhoDaCidade } from "@/lib/site"

export default async function Capa() {
  const c = container()
  const agora = c.relogio.agora()
  const [secoes, cidades, tabela] = await Promise.all([
    c.classificados.categoriasAtivas(),
    c.classificados.cidadesComAnuncios(agora, 12),
    c.configuracao.obter(),
  ])
  const preco = formatarReais(tabela.valorAnuncioCentavos)
  const periodo = plural(tabela.diasDePublicacao, "dia", "dias")

  return (
    <div className="flex flex-col gap-8 pt-5">
      <section aria-labelledby="titulo-busca" className="cartao p-4 sm:p-5">
        <h1 id="titulo-busca" className="mb-3 font-titulo text-lg font-bold uppercase tracking-wide">
          Procure os classificados da sua cidade
        </h1>
        <Filtros secoes={secoes.map(({ id, nome, slug }) => ({ id, nome, slug }))} />
      </section>

      <section aria-label="Como funciona" className="colunas-jornal columns-1 sm:columns-2 lg:columns-3">
        <CaixaAnuncio
          className="mb-4"
          conteudo={{
            titulo: "ANUNCIE AQUI",
            texto: `Seu anúncio no caderno da sua cidade por ${preco} a cada ${periodo}. Escreva, escolha a moldura e pague por Pix.`,
            precoCentavos: null,
            estilo: { moldura: "DUPLA", estiloTitulo: "TARJA", alinhamento: "CENTRO", estrelas: true },
          }}
          rodape={
            <div className="text-center">
              <Link href="/minha-conta/anuncios/novo" className="botao botao-pequeno">
                Criar meu anúncio
              </Link>
            </div>
          }
        />
        <CaixaAnuncio
          className="mb-4"
          conteudo={{
            titulo: "COMO FUNCIONA",
            texto: "1. Crie sua conta com seus dados.\n2. Monte o anúncio vendo a prévia do quadrado.\n3. Pague o Pix e o anúncio entra no caderno.\n4. Receba as mensagens dos interessados na sua conta.",
            precoCentavos: null,
            estilo: { moldura: "SIMPLES", estiloTitulo: "SUBLINHADO", alinhamento: "ESQUERDA", estrelas: false },
          }}
        />
        <CaixaAnuncio
          className="mb-4"
          conteudo={{
            titulo: "PARA QUEM PROCURA",
            texto: "Escolha o estado, a cidade e a seção. Cada quadrado tem um botão de mensagem e, quando há fotos, o álbum. Não precisa de cadastro para mandar mensagem.",
            precoCentavos: null,
            estilo: { moldura: "TRACEJADA", estiloTitulo: "NEGRITO", alinhamento: "ESQUERDA", estrelas: false },
          }}
        />
      </section>

      {cidades.length > 0 && (
        <section aria-labelledby="titulo-cidades">
          <Faixa className="mb-3">
            <span id="titulo-cidades">Cidades com anúncios no ar</span>
          </Faixa>
          <ul className="colunas-jornal columns-2 sm:columns-3 lg:columns-4">
            {cidades.map((item) => {
              const cidade = c.localidades.cidade(item.cidadeCodigo)
              if (!cidade) return null
              return (
                <li key={cidade.codigo} className="py-1">
                  <Link href={caminhoDaCidade(cidade)} className="link">
                    {cidade.nome}/{cidade.uf}
                  </Link>{" "}
                  <span className="text-sm text-tinta-suave">({item.total})</span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section aria-labelledby="titulo-secoes">
        <Faixa className="mb-3">
          <span id="titulo-secoes">Seções do caderno</span>
        </Faixa>
        <ul className="colunas-jornal columns-2 font-titulo text-sm uppercase tracking-wide sm:columns-3 lg:columns-4">
          {secoes.map((secao) => (
            <li key={secao.id} className="py-1">
              {secao.nome}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
