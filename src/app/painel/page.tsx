// APRESENTAÇÃO — resumo do painel.

import type { Metadata } from "next"
import Link from "next/link"
import { Faixa } from "@/components/jornal/pecas"
import { container } from "@/infrastructure/container"
import { formatarReais } from "@/lib/formatadores"

export const metadata: Metadata = { title: "Painel", robots: { index: false } }

export default async function Resumo() {
  const c = container()
  const [resumo, configuracao] = await Promise.all([c.painel.resumo(c.relogio.agora()), c.configuracao.obter()])

  const numeros = [
    { rotulo: "Anunciantes", valor: String(resumo.usuarios), href: "/painel/usuarios" },
    { rotulo: "Anúncios no ar", valor: String(resumo.anunciosNoAr), href: "/painel/anuncios?situacao=NO_AR" },
    { rotulo: "Aguardando pagamento", valor: String(resumo.aguardandoPagamento), href: "/painel/anuncios?situacao=AGUARDANDO_PAGAMENTO" },
    { rotulo: "Pagamentos confirmados", valor: String(resumo.pagamentosConfirmados), href: "/painel/usuarios?pagamento=PAGOS" },
    { rotulo: "Recebido", valor: formatarReais(resumo.valorRecebidoCentavos), href: "/painel/usuarios?pagamento=PAGOS" },
  ]

  return (
    <div className="flex flex-col gap-6">
      <Faixa como="h1">Resumo</Faixa>
      {!configuracao.pixChave && (
        <p className="border-2 border-perigo px-3 py-2">
          A chave Pix ainda não foi cadastrada: os anunciantes não veem o QR Code.{" "}
          <Link href="/painel/configuracoes" className="link font-bold">
            Cadastrar agora
          </Link>
          .
        </p>
      )}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {numeros.map((n) => (
          <li key={n.rotulo}>
            <Link href={n.href} className="cartao block p-4 hover:bg-papel-escuro">
              <span className="rotulo block text-tinta-suave">{n.rotulo}</span>
              <span className="mt-1 block font-manchete text-3xl">{n.valor}</span>
            </Link>
          </li>
        ))}
      </ul>
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
