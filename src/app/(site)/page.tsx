// APRESENTAÇÃO — capa organizada (feature 002): busca e "perto de mim", vitrine, como funciona, valores e contato.
// Sem lista de seções vazias (RF-40). A única consulta de anúncios é a vitrine, limitada (ADR-11).

import Link from "next/link"
import { AnuncioDoCaderno, Caderno } from "@/components/jornal/caderno"
import { Filtros } from "@/components/jornal/filtros"
import { FormularioContato } from "@/components/jornal/formulario-contato"
import { PertoDeMim } from "@/components/jornal/perto-de-mim"
import { TabelaDePrecos } from "@/components/jornal/tabela-de-precos"
import { ASSUNTOS, type Assunto } from "@/domain/chamado/chamado"
import { container } from "@/infrastructure/container"
import { precoInicial } from "@/lib/planos"

function Secao({ id, titulo, children, className }: { id: string; titulo: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} aria-labelledby={`titulo-${id}`} className={className}>
      <h2 id={`titulo-${id}`} className="tarja-secao mb-3 text-xl sm:text-2xl">
        {titulo}
      </h2>
      {children}
    </section>
  )
}

function Passo({ numero, titulo, children }: { numero: number; titulo: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="font-manchete text-4xl leading-none">{numero}</span>
      <div>
        <p className="font-titulo font-bold uppercase">{titulo}</p>
        <p className="text-sm leading-snug">{children}</p>
      </div>
    </li>
  )
}

export default async function Capa({ searchParams }: { searchParams: Promise<{ assunto?: string; anuncio?: string }> }) {
  const busca = await searchParams
  // "Denunciar este anúncio" chega aqui com o assunto e o código preenchidos (RF-61).
  const assuntoInicial = busca.assunto && busca.assunto in ASSUNTOS ? (busca.assunto as Assunto) : "DUVIDA"
  const anuncioCodigo = /^[A-Z0-9]{6}$/i.test(busca.anuncio ?? "") ? busca.anuncio!.toUpperCase() : ""
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
        <Secao id="vitrine" titulo="Vitrine">
          <Caderno>
            {vitrine.map((anuncio) => {
              const cidade = c.localidades.cidade(anuncio.cidadeCodigo)
              return <AnuncioDoCaderno key={anuncio.id} anuncio={anuncio} mostrarCidade={cidade ? `${cidade.nome}/${cidade.uf} · ${anuncio.categoriaNome}` : undefined} />
            })}
          </Caderno>
        </Secao>
      )}

      <Secao id="como-funciona" titulo="Como funciona">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <p className="mb-3 font-titulo text-lg font-bold uppercase">Para quem anuncia</p>
            <ol className="flex flex-col gap-4">
              <Passo numero={1} titulo="Crie sua conta">
                Nome, CPF, celular e cidade. O CPF não aparece no anúncio.
              </Passo>
              <Passo numero={2} titulo="Monte o anúncio">
                Escreva o texto e escolha moldura, título e estrelas vendo a prévia do jeito que sai no caderno.
              </Passo>
              <Passo numero={3} titulo="Escolha o plano e pague o Pix">
                7 ou 30 dias. O anúncio entra no caderno da cidade assim que o pagamento é confirmado.
              </Passo>
              <Passo numero={4} titulo="Divulgue e receba mensagens">
                Cada anúncio tem página própria com link, botões para WhatsApp e redes e cartaz com QR Code para imprimir.
              </Passo>
            </ol>
          </div>
          <div>
            <p className="mb-3 font-titulo text-lg font-bold uppercase">Para quem procura</p>
            <ol className="flex flex-col gap-4">
              <Passo numero={1} titulo="Escolha a cidade">
                Pelo estado e cidade na busca acima, ou pelo botão &quot;Anúncios perto de mim&quot;.
              </Passo>
              <Passo numero={2} titulo="Leia o caderno">
                As seções aparecem como no jornal: Imóveis, Veículos, Empregos, Serviços e outras.
              </Passo>
              <Passo numero={3} titulo="Fale com o anunciante">
                Toque no anúncio ou no ícone de mensagem e deixe seu nome e contato. Não precisa de cadastro.
              </Passo>
            </ol>
            <p className="mt-5 border-l-4 border-tinta pl-3 text-sm">
              O site não intermedeia a venda. Combine direto com o anunciante e não pague nada antes de ver o produto.
            </p>
          </div>
        </div>
      </Secao>

      <Secao id="valores" titulo="Valores">
        <TabelaDePrecos planos={planos} />
        <p className="mt-3 text-sm text-tinta-suave">Pagamento por Pix. Pagar de novo soma os dias ao que ainda resta.</p>
      </Secao>

      <Secao id="contato" titulo="Contato">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <FormularioContato assuntoInicial={assuntoInicial} anuncioCodigo={anuncioCodigo} />
          <div className="flex flex-col gap-2 text-sm">
            <p className="font-titulo font-bold uppercase">Dúvidas, suporte e denúncias</p>
            <p>Escreva pelo formulário. Cada mensagem recebe um protocolo e é respondida pelo e-mail informado.</p>
            <p>
              Para denunciar um anúncio, informe o código dele (aparece no rodapé do anúncio) ou use o link &quot;Denunciar&quot; na página do anúncio.
            </p>
            <p>
              <Link href="/termos" className="link">
                Termos de uso e privacidade
              </Link>
            </p>
          </div>
        </div>
      </Secao>
    </div>
  )
}
