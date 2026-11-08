"use client"

// APRESENTAÇÃO — filtros abaixo do título: UF → Cidade → Seção → Pesquisar (RF-04, RF-05).
// A pesquisa vira endereço próprio (/df/brasilia/veiculos): dá para compartilhar e o Google indexa.

import { Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { type FormEvent, useState } from "react"
import { toast } from "sonner"
import { type CidadeOpcao, SeletorLocalidade } from "@/components/seletor-localidade"
import { cn } from "@/lib/utils"

export interface SecaoOpcao {
  id: string
  nome: string
  slug: string
}

export function Filtros({
  secoes,
  ufInicial = "",
  cidadeInicial,
  secaoInicial = "",
  className,
}: {
  secoes: SecaoOpcao[]
  ufInicial?: string
  cidadeInicial?: CidadeOpcao | null
  secaoInicial?: string
  className?: string
}) {
  const router = useRouter()
  const [uf, setUf] = useState(ufInicial)
  const [cidade, setCidade] = useState<CidadeOpcao | null>(cidadeInicial ?? null)
  const [secao, setSecao] = useState(secaoInicial)
  const [indo, setIndo] = useState(false)

  function pesquisar(evento: FormEvent) {
    evento.preventDefault()
    if (!uf || !cidade) {
      toast.error(!uf ? "Escolha o estado." : "Escolha a cidade.")
      return
    }
    setIndo(true)
    const base = `/${uf.toLowerCase()}/${cidade.slug}`
    router.push(secao ? `${base}/${secao}` : base)
    setTimeout(() => setIndo(false), 1500)
  }

  return (
    <form onSubmit={pesquisar} className={cn("grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,16rem)_auto] md:items-end", className)} role="search">
      <SeletorLocalidade
        nomeUf="filtro-uf"
        nomeCidade="filtro-cidade"
        ufInicial={ufInicial}
        cidadeInicial={cidadeInicial?.codigo}
        aoMudar={(novaUf, novaCidade) => {
          setUf(novaUf)
          setCidade(novaCidade)
        }}
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="filtro-secao" className="rotulo">
          Seção
        </label>
        <select id="filtro-secao" className="campo" value={secao} onChange={(e) => setSecao(e.target.value)}>
          <option value="">Todas as seções</option>
          {secoes.map((s) => (
            <option key={s.id} value={s.slug}>
              {s.nome}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className="botao" disabled={indo}>
        <Search className="size-4" aria-hidden />
        Pesquisar
      </button>
    </form>
  )
}
