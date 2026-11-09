// APRESENTAÇÃO — página de divulgação da plataforma: /como-funciona (feature 002, RF-48).
// Link próprio para propaganda: o que é, por que anunciar, como funciona, valores, perguntas, contato e botões para compartilhar.

import type { Metadata } from "next"
import Link from "next/link"
import { CaixaAnuncio } from "@/components/jornal/caixa-anuncio"
import { Divulgar } from "@/components/jornal/divulgar"
import { FormularioContato } from "@/components/jornal/formulario-contato"
import { TabelaDePrecos } from "@/components/jornal/tabela-de-precos"
import { ASSUNTOS, type Assunto } from "@/domain/chamado/chamado"
import { container } from "@/infrastructure/container"
import { precoInicial } from "@/lib/planos"
import { NOME_DO_SITE, urlDoSite } from "@/lib/site"

export const metadata: Metadata = {
  title: "Como funciona: anuncie na sua cidade",
  description: "Classificados por cidade no formato do jornal. Anúncio com página própria, mensagens e cartaz com QR Code, pago por Pix.",
  alternates: { canonical: "/como-funciona" },
  openGraph: { title: `${NOME_DO_SITE}: anuncie na sua cidade`, description: "Classificados por cidade no formato do jornal, pagos por Pix." },
}

function Secao({ id, titulo, children }: { id: string; titulo: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`titulo-${id}`} className="scroll-mt-4">
      <h2 id={`titulo-${id}`} className="tarja-secao mb-4 text-xl sm:text-2xl">
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

function Motivo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="border border-tinta p-4">
      <p className="font-titulo text-lg font-bold uppercase">{titulo}</p>
      <p className="mt-1 text-sm leading-snug">{children}</p>
    </div>
  )
}

function Pergunta({ pergunta, children }: { pergunta: string; children: React.ReactNode }) {
  return (
    <details className="group border-b border-tinta py-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-titulo font-bold uppercase">
        {pergunta}
        <span aria-hidden className="font-manchete text-xl transition-transform group-open:rotate-45">
          +
        </span>
      </summary>
      <div className="mt-2 text-sm leading-relaxed">{children}</div>
    </details>
  )
}

export default async function ComoFunciona({ searchParams }: { searchParams: Promise<{ assunto?: string; anuncio?: string }> }) {
  const busca = await searchParams
  // "Denunciar este anúncio" chega aqui com o assunto e o código preenchidos (RF-61).
  const assuntoInicial = busca.assunto && busca.assunto in ASSUNTOS ? (busca.assunto as Assunto) : "DUVIDA"
  const anuncioCodigo = /^[A-Z0-9]{6}$/i.test(busca.anuncio ?? "") ? busca.anuncio!.toUpperCase() : ""
  const planos = await container().classificados.planosAVenda()
  const preco = precoInicial(planos)

  return (
    <div className="flex flex-col gap-14 pb-4 pt-8">
      {/* Abertura */}
      <section className="grid items-center gap-8 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <h1 className="font-manchete text-[clamp(2.4rem,7vw,4.5rem)] uppercase leading-[0.95]">Anuncie no caderno da sua cidade</h1>
          <p className="text-lg leading-snug sm:text-xl">
            O {NOME_DO_SITE} é o classificado do jornal, agora na internet: anúncios por cidade e por seção, a partir de <strong>{preco}</strong>, pagos por
            Pix. Quem procura não paga e não precisa de cadastro.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/minha-conta/anuncios/novo" className="botao">
              Anunciar agora
            </Link>
            <Link href="/" className="botao botao-vazado">
              Procurar anúncios
            </Link>
          </div>
        </div>
        <div className="mx-auto w-full max-w-[17rem] rotate-1">
          <CaixaAnuncio
            destaque
            conteudo={{
              titulo: "Vendo, alugo, contrato",
              texto: "Seu anúncio aqui, no formato do jornal, com página própria, mensagens dos interessados e cartaz com QR Code para divulgar.",
              precoCentavos: null,
              estilo: { moldura: "DUPLA", estiloTitulo: "TARJA", alinhamento: "CENTRO", estrelas: true },
            }}
          />
        </div>
      </section>

      <Secao id="por-que" titulo="Por que anunciar aqui">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Motivo titulo="Barato e por Pix">A partir de {preco}. Paga na hora pelo celular, sem cartão e sem mensalidade.</Motivo>
          <Motivo titulo="Na sua cidade">O anúncio aparece no caderno da cidade e da seção escolhidas, para quem mora perto.</Motivo>
          <Motivo titulo="Página própria">Cada anúncio tem link curto, prévia no WhatsApp e cartaz com QR Code para imprimir.</Motivo>
          <Motivo titulo="Sem expor seu número">Os interessados mandam mensagem pela página. Seu CPF, celular e e-mail não aparecem.</Motivo>
        </div>
      </Secao>

      <div className="grid gap-10 md:grid-cols-2">
        <Secao id="anunciar" titulo="Para quem anuncia">
          <ol className="flex flex-col gap-4">
            <Passo numero={1} titulo="Crie sua conta">
              Nome, CPF, celular e cidade. O CPF serve para uma conta por pessoa e não aparece no anúncio.
            </Passo>
            <Passo numero={2} titulo="Monte o anúncio">
              Escreva o texto e escolha moldura, título e estrelas vendo a prévia do jeito que sai no caderno.
            </Passo>
            <Passo numero={3} titulo="Escolha o plano e pague o Pix">
              O anúncio entra no caderno da cidade assim que o pagamento é confirmado.
            </Passo>
            <Passo numero={4} titulo="Divulgue">
              Mande o link no WhatsApp e nas redes, ou imprima o cartaz com QR Code e cole onde as pessoas passam.
            </Passo>
            <Passo numero={5} titulo="Receba as mensagens">
              Os interessados escrevem pela página do anúncio e você responde pelo contato que eles deixaram.
            </Passo>
          </ol>
        </Secao>

        <Secao id="procurar" titulo="Para quem procura">
          <ol className="flex flex-col gap-4">
            <Passo numero={1} titulo="Escolha a cidade">
              Estado, cidade e seção na página inicial, ou o link &quot;Anúncios perto de mim&quot;.
            </Passo>
            <Passo numero={2} titulo="Leia o caderno">
              As seções aparecem como no jornal: Imóveis, Veículos, Empregos, Serviços e outras.
            </Passo>
            <Passo numero={3} titulo="Fale com o anunciante">
              Abra o anúncio e deixe seu nome, um telefone ou e-mail e a mensagem. Não precisa de cadastro.
            </Passo>
          </ol>
          <p className="mt-5 border-l-4 border-tinta pl-3 text-sm">
            O site não intermedeia a venda. Combine direto com o anunciante e não pague nada antes de ver o produto.
          </p>
        </Secao>
      </div>

      <Secao id="valores" titulo="Valores">
        <TabelaDePrecos planos={planos} />
        <p className="mt-3 text-sm text-tinta-suave">Pagamento por Pix. Pagar de novo soma os dias ao que ainda resta.</p>
      </Secao>

      <Secao id="perguntas" titulo="Perguntas frequentes">
        <div className="max-w-3xl">
          <Pergunta pergunta="Preciso de cadastro para procurar ou mandar mensagem?">Não. Cadastro só para quem anuncia.</Pergunta>
          <Pergunta pergunta="Quanto tempo o anúncio fica no ar?">
            Pelo período escolhido no plano. Para continuar, renove: os dias novos entram depois dos que ainda restam.
          </Pergunta>
          <Pergunta pergunta="Quando o anúncio entra no caderno?">Logo depois que o Pix é confirmado. A tela de pagamento avisa quando cai.</Pergunta>
          <Pergunta pergunta="Posso mudar o texto depois de publicado?">Sim. Texto, preço e formatação mudam a qualquer momento, sem pagar de novo.</Pergunta>
          <Pergunta pergunta="Quantas fotos posso colocar?">Depende do plano. Veja a tabela de valores.</Pergunta>
          <Pergunta pergunta="Como divulgo meu anúncio?">
            Abra o anúncio e use os botões de divulgar: link curto, WhatsApp, Facebook, Telegram, X e o cartaz com QR Code para imprimir. Quem aponta a
            câmera do celular para o cartaz cai direto no anúncio.
          </Pergunta>
          <Pergunta pergunta="Meus dados aparecem no anúncio?">Não. CPF, e-mail e celular do anunciante não são mostrados no site.</Pergunta>
          <Pergunta pergunta="O que não pode ser anunciado?">
            Armas, medicamentos controlados, animais silvestres, produtos falsificados ou roubados e qualquer coisa ilegal. Veja os{" "}
            <Link href="/termos" className="link">
              termos de uso
            </Link>
            .
          </Pergunta>
          <Pergunta pergunta="Como denuncio um anúncio?">
            Pelo link &quot;Denunciar este anúncio&quot; na página dele, ou pelo formulário abaixo com o código do anúncio (aparece no rodapé de cada anúncio).
          </Pergunta>
        </div>
      </Secao>

      <Secao id="contato" titulo="Contato">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <FormularioContato assuntoInicial={assuntoInicial} anuncioCodigo={anuncioCodigo} />
          <div className="flex flex-col gap-2 text-sm">
            <p className="font-titulo font-bold uppercase">Dúvidas, suporte, pagamento e denúncias</p>
            <p>Cada mensagem recebe um número de protocolo e é respondida pelo e-mail informado.</p>
            <p>
              <Link href="/termos" className="link">
                Termos de uso e privacidade
              </Link>
            </p>
          </div>
        </div>
      </Secao>

      <Secao id="compartilhar" titulo="Compartilhe com quem vende">
        <p className="mb-3 text-sm">Conhece alguém que vende, aluga ou presta serviço? Mande esta página.</p>
        <Divulgar titulo={`Anuncie na sua cidade a partir de ${preco}`} link={`${urlDoSite()}/como-funciona`} />
      </Secao>
    </div>
  )
}
