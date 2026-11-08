import Link from "next/link"
import { Cabecalho } from "@/components/jornal/cabecalho"
import { Rodape } from "@/components/jornal/pecas"
import { exigirPerfil } from "@/lib/sessao"
import { sairAction } from "../(acesso)/actions"

export const dynamic = "force-dynamic"

export default async function LayoutDaConta({ children }: { children: React.ReactNode }) {
  const usuario = await exigirPerfil("ANUNCIANTE")
  return (
    <>
      <Cabecalho compacto />
      <div className="mx-auto w-full max-w-7xl px-4">
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-fio py-2 font-titulo text-sm uppercase tracking-wide" aria-label="Minha conta">
          <span className="mr-auto normal-case tracking-normal">
            Olá, <strong>{usuario.nome.split(" ")[0]}</strong>
          </span>
          <Link href="/minha-conta" className="hover:underline">
            Meus anúncios
          </Link>
          <Link href="/minha-conta/anuncios/novo" className="font-bold hover:underline">
            Novo anúncio
          </Link>
          <Link href="/minha-conta/perfil" className="hover:underline">
            Meus dados
          </Link>
          <form action={sairAction}>
            <button type="submit" className="uppercase hover:underline">
              Sair
            </button>
          </form>
        </nav>
      </div>
      <main className="mx-auto w-full max-w-7xl px-4 pt-5">{children}</main>
      <Rodape />
    </>
  )
}
