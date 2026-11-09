import { Cabecalho } from "@/components/jornal/cabecalho"
import { Rodape } from "@/components/jornal/pecas"

// Página de divulgação da plataforma (link próprio para propaganda): cabeçalho compacto, sem o caderno.
export const dynamic = "force-dynamic"

export default function LayoutDeDivulgacao({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Cabecalho compacto />
      <main className="mx-auto w-full max-w-6xl px-3 sm:px-4">{children}</main>
      <Rodape />
    </>
  )
}
