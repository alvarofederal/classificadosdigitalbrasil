// APRESENTAÇÃO — termos de uso e política de privacidade (RNF-05, LGPD).

import type { Metadata } from "next"
import { Faixa } from "@/components/jornal/pecas"

export const metadata: Metadata = { title: "Termos de uso e privacidade" }

export default function Termos() {
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-4 pt-6 leading-relaxed">
      <Faixa como="h1">Termos de uso</Faixa>
      <p>
        O Classificados Digitais do Brasil publica anúncios classificados por cidade e seção. O anunciante cria uma conta com seus dados
        pessoais, escreve o anúncio e paga pelo espaço. O anúncio fica no ar pelo período pago e sai sozinho ao fim do prazo.
      </p>
      <p>
        O site não intermedeia a negociação. Preço, entrega e pagamento do que é anunciado são combinados diretamente entre as partes.
        Desconfie de pedidos de pagamento antecipado e confira o produto antes de pagar.
      </p>
      <h2 className="font-titulo text-lg font-bold uppercase">O que não pode ser anunciado</h2>
      <p>
        Armas e munição, medicamentos controlados, animais silvestres, produtos falsificados ou roubados, documentos, serviços ilegais e
        qualquer conteúdo que viole a lei ou direitos de terceiros. Anúncios assim são removidos sem reembolso. Na seção Adulto valem as
        mesmas regras e só são aceitos anúncios de pessoas maiores de 18 anos.
      </p>
      <h2 className="font-titulo text-lg font-bold uppercase">Pagamento</h2>
      <p>
        O valor e o período de cada anúncio aparecem antes do pagamento. O anúncio entra no ar quando o Pix é confirmado. Pagar de novo
        soma o período ao que ainda resta.
      </p>

      <Faixa como="h2" className="mt-4">
        <span id="privacidade">Privacidade</span>
      </Faixa>
      <p>
        Guardamos nome, CPF, e-mail, celular, cidade e senha (cifrada) de quem anuncia. O CPF serve para uma conta por pessoa e para
        prevenção de fraude; ele nunca aparece no anúncio. E-mail e celular não são exibidos publicamente.
      </p>
      <p>
        Quem manda mensagem a um anunciante informa nome e um contato. Esses dados vão apenas para o anunciante daquele anúncio: ficam na
        área dele no site e seguem por e-mail para o endereço da conta dele.
      </p>
      <p>
        Registros de acesso são mantidos pelo prazo exigido pelo Marco Civil da Internet. Para corrigir ou excluir seus dados, use a área
        Minha conta ou fale com o administrador do site.
      </p>
    </article>
  )
}
