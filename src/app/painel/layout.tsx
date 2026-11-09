import Link from "next/link"
import { exigirPerfil } from "@/lib/sessao"
import { sairAction } from "../(acesso)/actions"

export const dynamic = "force-dynamic"

const ITENS = [
  { href: "/painel", rotulo: "Resumo" },
  { href: "/painel/anuncios", rotulo: "Anúncios" },
  { href: "/painel/usuarios", rotulo: "Usuários" },
  { href: "/painel/chamados", rotulo: "Chamados" },
  { href: "/painel/planos", rotulo: "Planos" },
  { href: "/painel/categorias", rotulo: "Categorias" },
  { href: "/painel/configuracoes", rotulo: "Configurações" },
]

export default async function LayoutDoPainel({ children }: { children: React.ReactNode }) {
  const admin = await exigirPerfil("ADMIN")
  return (
    <div className="min-h-dvh">
      <header className="faixa">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2">
          <Link href="/painel" className="mr-auto font-manchete text-2xl font-normal tracking-wide">
            Classificados · Painel
          </Link>
          <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="Painel">
            {ITENS.map((item) => (
              <Link key={item.href} href={item.href} className="hover:underline">
                {item.rotulo}
              </Link>
            ))}
            <Link href="/" className="hover:underline">
              Ver site
            </Link>
            <form action={sairAction}>
              <button type="submit" className="uppercase hover:underline">
                Sair
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-6">
        <p className="mb-4 text-sm text-tinta-suave">Administrador: {admin.nome}</p>
        {children}
      </main>
    </div>
  )
}
