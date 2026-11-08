import { Cabecalho } from "@/components/jornal/cabecalho"
import { Rodape } from "@/components/jornal/pecas"

// O caderno muda a cada pagamento confirmado: renderização por requisição (ADR-08).
export const dynamic = "force-dynamic"

export default function LayoutDoSite({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Cabecalho />
      <main className="mx-auto w-full max-w-7xl px-4">{children}</main>
      <Rodape />
    </>
  )
}
