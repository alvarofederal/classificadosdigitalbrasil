import { Cabecalho } from "@/components/jornal/cabecalho"
import { Rodape } from "@/components/jornal/pecas"

export const dynamic = "force-dynamic"

export default function LayoutDeAcesso({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Cabecalho compacto />
      <main className="mx-auto w-full max-w-xl px-4 pt-6">{children}</main>
      <Rodape />
    </>
  )
}
