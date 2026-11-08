import Link from "next/link"

export default function NaoEncontrado() {
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="font-manchete text-6xl uppercase">Esgotado</p>
      <div className="fio-duplo w-full" />
      <p>Esta página não existe ou o anúncio já saiu do caderno.</p>
      <Link href="/" className="botao">
        Voltar à capa
      </Link>
    </main>
  )
}
