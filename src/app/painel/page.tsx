// APRESENTAÇÃO — resumo do painel.

import type { Metadata } from "next"
import Link from "next/link"
import { Faixa } from "@/components/jornal/pecas"
import { container } from "@/infrastructure/container"
import { formatarDataHora, formatarReais } from "@/lib/formatadores"
import { cn } from "@/lib/utils"
import { ContatoDoCadastro } from "./_componentes/contato-do-cadastro"

export const metadata: Metadata = { title: "Painel", robots: { index: false } }

export default async function Resumo() {
  const c = container()
  const [resumo, configuracao, cadastros] = await Promise.all([
    c.painel.resumo(c.relogio.agora()),
    c.configuracao.obter(),
    // Feature 024 (RF-244): cadastros sem confirmação esperando contato ou aguardando resposta.
    c.lembreteDeCadastros.listar(),
  ])
  const esperando = cadastros.filter((x) => x.esperaContato).length

  const numeros = [
    { rotulo: "Anunciantes", valor: String(resumo.usuarios), href: "/painel/usuarios" },
    { rotulo: "Anúncios no ar", valor: String(resumo.anunciosNoAr), href: "/painel/anuncios?situacao=NO_AR" },
    { rotulo: "Aguardando pagamento", valor: String(resumo.aguardandoPagamento), href: "/painel/anuncios?situacao=AGUARDANDO_PAGAMENTO" },
    { rotulo: "Pagamentos confirmados", valor: String(resumo.pagamentosConfirmados), href: "/painel/usuarios?pagamento=PAGOS" },
    { rotulo: "Recebido", valor: formatarReais(resumo.valorRecebidoCentavos), href: "/painel/usuarios?pagamento=PAGOS" },
    { rotulo: "Chamados abertos", valor: String(resumo.chamadosAbertos), href: "/painel/chamados" },
  ]
  // Feature 021 (RF-213): o que os donos contaram no "Fechou negócio?".
  const negocios = [
    { rotulo: "Negócios pelo Classificados", valor: resumo.resultados.PELO_CLASSIFICADOS },
    { rotulo: "Negócios por outro lugar", valor: resumo.resultados.POR_OUTRO_LUGAR },
    { rotulo: "Ainda sem negócio", valor: resumo.resultados.AINDA_NAO },
  ]

  return (
    <div className="flex flex-col gap-6">
      <Faixa como="h1">Resumo</Faixa>
      {/* Feature 024 (RF-244): o lembrete do administrador, logo ao abrir o Painel. */}
      {cadastros.length > 0 && (
        <section
          id="cadastros-sem-confirmacao"
          aria-labelledby="titulo-cadastros"
          className={cn("flex flex-col gap-3 border-2 p-4", esperando > 0 ? "border-perigo" : "border-tinta")}
        >
          <h2 id="titulo-cadastros" className={cn("font-titulo text-lg font-bold uppercase", esperando > 0 && "text-perigo")}>
            {esperando === 0
              ? "Cadastros aguardando resposta"
              : esperando === 1
                ? "1 cadastro esperando o seu contato"
                : `${esperando} cadastros esperando o seu contato`}
          </h2>
          <p className="text-sm">
            Contas que não confirmaram o e-mail. O botão manda um e-mail para a pessoa continuar ou desistir; sem resposta em 7 dias, a conta é apagada
            sozinha.
          </p>
          <ul className="flex flex-col divide-y divide-fio">
            {cadastros.map((x) => (
              <li key={x.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2">
                <span className="min-w-0">
                  <strong>{x.nome}</strong> · <span className="break-all">{x.email}</span>
                  <br />
                  <span className="text-xs text-tinta-suave">Cadastro em {formatarDataHora(x.criadoEm)}</span>
                </span>
                <ContatoDoCadastro usuarioId={x.id} contatoEnviadoEm={x.contatoEnviadoEm} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {!c.pixAutomatico && (
        <p className="border-2 border-perigo px-3 py-2">
          Pix automático desligado: cada pagamento precisa ser confirmado à mão
          {configuracao.pixChave ? "" : " e a chave do Pix estático ainda não foi cadastrada (os anunciantes não veem o QR Code)"}.{" "}
          <Link href="/painel/configuracoes" className="link font-bold">
            Ver configurações
          </Link>
          .
        </p>
      )}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {numeros.map((n) => (
          <li key={n.rotulo}>
            <Link href={n.href} className="cartao block p-4 hover:bg-papel-escuro">
              <span className="rotulo block text-tinta-suave">{n.rotulo}</span>
              <span className="mt-1 block font-manchete text-3xl">{n.valor}</span>
            </Link>
          </li>
        ))}
      </ul>
      <section aria-labelledby="titulo-negocios" className="flex flex-col gap-2">
        <h2 id="titulo-negocios" className="font-titulo text-lg font-bold uppercase">
          Fechou negócio?
        </h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {negocios.map((n) => (
            <li key={n.rotulo} className="cartao p-4">
              <span className="rotulo block text-tinta-suave">{n.rotulo}</span>
              <span className="mt-1 block font-manchete text-3xl">{n.valor}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-tinta-suave">Respostas dos anunciantes, na tela do anúncio e no e-mail de vencimento.</p>
      </section>
      {/* Feature 015 (RF-256) */}
      <p className="text-sm">
        <strong>Convites:</strong> {resumo.convites.enviados} enviados · {resumo.convites.aceitos} com conta criada · {resumo.convites.premiados} com anúncio publicado.
      </p>
      {resumo.aguardandoPagamento > 0 && (
        <p>
          Há {resumo.aguardandoPagamento} anúncio(s) esperando a confirmação do Pix.{" "}
          <Link href="/painel/anuncios?situacao=AGUARDANDO_PAGAMENTO" className="link font-bold">
            Conferir e confirmar
          </Link>
          . Procure no extrato do banco pelo identificador de cada pagamento.
        </p>
      )}
    </div>
  )
}
