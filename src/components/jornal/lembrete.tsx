// APRESENTAÇÃO — o número do lembrete do administrador: cadastros esperando o e-mail de continuar ou desistir (feature 024, RF-245).
// Vermelho, como os outros avisos do sistema (04-design-system). Sem cadastro esperando, não aparece.

export function MarcaDoLembrete({ total }: { total: number }) {
  if (total <= 0) return null
  const texto = total === 1 ? "1 cadastro esperando contato" : `${total} cadastros esperando contato`
  return (
    <span
      title={texto}
      className="ml-1 inline-flex min-w-[1.5em] items-center justify-center bg-perigo px-1 align-[0.1em] font-titulo text-[0.8em] font-bold leading-[1.45] tracking-normal text-white"
    >
      <span aria-hidden>{total}</span>
      <span className="sr-only">, {texto}</span>
    </span>
  )
}
