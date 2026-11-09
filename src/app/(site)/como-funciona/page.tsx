// APRESENTAÇÃO — página "Como funciona" (feature 002, revisão de 2026-11-09): funcionamento, valores,
// perguntas frequentes e contato numa página própria, para a capa ficar só com a busca e a vitrine.

import type { Metadata } from "next"
import Link from "next/link"
import { FormularioContato } from "@/components/jornal/formulario-contato"
import { TabelaDePrecos } from "@/components/jornal/tabela-de-precos"
import { ASSUNTOS, type Assunto } from "@/domain/chamado/chamado"
import { container } from "@/infrastructure/container"
import { precoInicial } from "@/lib/planos"

export const metadata: Metadata = {
  title: "Como funciona, valores e contato",
  description: "Como anunciar e procurar no Classificados Digitais do Brasil, a tabela de planos e o contato com a administração.",
  alternates: { canonical: "/como-funciona" },
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
  const c = container()
  const planos = await c.classificados.planosAVenda()
  const preco = precoInicial(planos)

  return (
    <div className="flex flex-col gap-12 pt-4">
      <header className="flex flex-col gap-3">
        <h1 className="font-titulo text-3xl font-bold uppercase sm:text-4xl">Como funciona</h1>
        <p className="max-w-3xl text-lg leading-snug">
          Classificados por cidade, no formato do caderno de jornal. Quem procura não paga e não precisa de cadastro. Quem anuncia paga a partir de{" "}
          <strong>{preco}</strong> e ganha uma página própria para divulgar.
        </p>
        <nav className="flex flex-wrap gap-2" aria-label="Nesta página">
          <a href="#anunciar" className="botao botao-vazado botao-pequeno">
            Para quem anuncia
          </a>
          <a href="#procurar" className="botao botao-vazado botao-pequeno">
            Para quem procura
          </a>
          <a href="#valores" className="botao botao-vazado botao-pequeno">
            Valores
          </a>
          <a href="#perguntas" className="botao botao-vazado botao-pequeno">
            Perguntas frequentes
          </a>
          <a href="#contato" className="botao botao-vazado botao-pequeno">
            Contato
          </a>
        </nav>
      </header>

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
              7 ou 30 dias. O anúncio entra no caderno da cidade assim que o pagamento é confirmado.
            </Passo>
            <Passo numero={4} titulo="Divulgue">
              Cada anúncio tem página própria com link curto, botões para WhatsApp e redes sociais e um cartaz com QR Code para imprimir e colar.
            </Passo>
            <Passo numero={5} titulo="Receba as mensagens">
              Os interessados escrevem pela caixa de conversa do anúncio e você responde pelo contato que eles deixaram.
            </Passo>
          </ol>
          <Link href="/minha-conta/anuncios/novo" className="botao mt-5">
            Criar meu anúncio
          </Link>
        </Secao>

        <Secao id="procurar" titulo="Para quem procura">
          <ol className="flex flex-col gap-4">
            <Passo numero={1} titulo="Escolha a cidade">
              Pelo estado e cidade na busca da capa, ou pelo botão &quot;Anúncios perto de mim&quot;.
            </Passo>
            <Passo numero={2} titulo="Leia o caderno">
              As seções aparecem como no jornal: Imóveis, Veículos, Empregos, Serviços e outras.
            </Passo>
            <Passo numero={3} titulo="Abra o anúncio">
              Toque no anúncio para ver as fotos e a página completa, ou use o ícone de mensagem direto no caderno.
            </Passo>
            <Passo numero={4} titulo="Fale com o anunciante">
              Deixe seu nome, um telefone ou e-mail e a mensagem. Não precisa de cadastro.
            </Passo>
          </ol>
          <p className="mt-5 border-l-4 border-tinta pl-3 text-sm">
            O site não intermedeia a venda. Combine direto com o anunciante e não pague nada antes de ver o produto.
          </p>
        </Secao>
      </div>

      <Secao id="valores" titulo="Valores">
        <TabelaDePrecos planos={planos} />
        <p className="mt-3 text-sm text-tinta-suave">Pagamento por Pix. Pagar de novo soma os dias ao que ainda resta. O plano de 30 dias sai pelo preço de 3 semanas.</p>
      </Secao>

      <Secao id="perguntas" titulo="Perguntas frequentes">
        <div className="max-w-3xl">
          <Pergunta pergunta="Preciso de cadastro para procurar ou mandar mensagem?">Não. Cadastro só para quem anuncia.</Pergunta>
          <Pergunta pergunta="Quanto tempo o anúncio fica no ar?">
            7 ou 30 dias, conforme o período escolhido. Para continuar, renove: os dias novos entram depois dos que ainda restam.
          </Pergunta>
          <Pergunta pergunta="Quando o anúncio entra no caderno?">Logo depois que o Pix é confirmado. A tela de pagamento avisa quando cai.</Pergunta>
          <Pergunta pergunta="Posso mudar o texto depois de publicado?">Sim. Texto, preço e formatação mudam a qualquer momento, sem pagar de novo.</Pergunta>
          <Pergunta pergunta="Quantas fotos posso colocar?">Depende do plano: 1 foto no Simples e até 6 a partir do Com fotos. Veja a tabela acima.</Pergunta>
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
    </div>
  )
}
