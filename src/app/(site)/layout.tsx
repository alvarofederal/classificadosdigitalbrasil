import { Cabecalho } from "@/components/jornal/cabecalho"
import { Rodape } from "@/components/jornal/pecas"

// O caderno muda a cada pagamento confirmado: renderização por requisição (ADR-08).
export const dynamic = "force-dynamic"

// `lugar` é a rota paralela @lugar: a cidade da página na linha fina do cabeçalho (feature 023, ADR-23).
export default function LayoutDoSite({ children, lugar }: { children: React.ReactNode; lugar: React.ReactNode }) {
  return (
    <>
      <Cabecalho lugar={lugar} />
      <main className="mx-auto w-full max-w-[1400px] px-3 sm:px-4">{children}</main>
      <Rodape />
    </>
  )
}
