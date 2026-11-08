"use client"

// APRESENTAÇÃO — UF → Cidade. A lista de cidades de cada UF é um JSON estático baixado sob demanda (ADR-06).

import { useEffect, useState } from "react"
import { SIGLAS_UF, UFS } from "@/domain/localidade/uf"
import { cn } from "@/lib/utils"
import { Campo, aria } from "./formulario"

export interface CidadeOpcao {
  codigo: number
  nome: string
  slug: string
}

const cache = new Map<string, Promise<CidadeOpcao[]>>()

export function carregarCidades(uf: string): Promise<CidadeOpcao[]> {
  if (!uf) return Promise.resolve([])
  if (!cache.has(uf)) {
    const pedido = fetch(`/municipios/${uf}.json`)
      .then((r) => (r.ok ? r.json() : []))
      .then((linhas: Array<[number, string, string]>) => linhas.map(([codigo, nome, slug]) => ({ codigo, nome, slug })))
      .catch(() => {
        cache.delete(uf)
        return []
      })
    cache.set(uf, pedido)
  }
  return cache.get(uf)!
}

export function SeletorLocalidade({
  nomeUf = "uf",
  nomeCidade = "cidadeCodigo",
  ufInicial = "",
  cidadeInicial = 0,
  erroUf,
  erroCidade,
  obrigatorio,
  aoMudar,
  rotuloUf = "Estado",
  rotuloCidade = "Cidade",
  textoTodasCidades,
  className,
}: {
  nomeUf?: string
  nomeCidade?: string
  ufInicial?: string
  cidadeInicial?: number
  erroUf?: string
  erroCidade?: string
  obrigatorio?: boolean
  aoMudar?: (uf: string, cidade: CidadeOpcao | null) => void
  rotuloUf?: string
  rotuloCidade?: string
  /** Quando informado, a cidade é opcional e esta é a opção vazia (filtros do painel). */
  textoTodasCidades?: string
  className?: string
}) {
  const [uf, setUf] = useState(ufInicial)
  const [codigo, setCodigo] = useState(cidadeInicial ? String(cidadeInicial) : "")
  const [cidades, setCidades] = useState<CidadeOpcao[]>([])
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    let ativo = true
    setCarregando(true)
    carregarCidades(uf).then((lista) => {
      if (!ativo) return
      setCidades(lista)
      setCarregando(false)
    })
    return () => {
      ativo = false
    }
  }, [uf])

  function escolherUf(nova: string) {
    setUf(nova)
    setCodigo("")
    aoMudar?.(nova, null)
  }

  function escolherCidade(novo: string) {
    setCodigo(novo)
    aoMudar?.(uf, cidades.find((c) => String(c.codigo) === novo) ?? null)
  }

  return (
    <div className={cn("grid grid-cols-[6rem_minmax(0,1fr)] gap-3", className)}>
      <Campo rotulo={rotuloUf} nome={nomeUf} erro={erroUf} obrigatorio={obrigatorio}>
        <select {...aria(nomeUf, erroUf)} className="campo" value={uf} onChange={(e) => escolherUf(e.target.value)}>
          <option value="">UF</option>
          {SIGLAS_UF.map((sigla) => (
            <option key={sigla} value={sigla} title={UFS[sigla]} aria-label={UFS[sigla]}>
              {sigla}
            </option>
          ))}
        </select>
      </Campo>
      <Campo rotulo={rotuloCidade} nome={nomeCidade} erro={erroCidade} obrigatorio={obrigatorio}>
        <select
          {...aria(nomeCidade, erroCidade)}
          className="campo"
          value={codigo}
          disabled={!uf || carregando}
          onChange={(e) => escolherCidade(e.target.value)}
        >
          <option value="">{!uf ? "Escolha o estado primeiro" : carregando ? "Carregando cidades…" : (textoTodasCidades ?? "Escolha a cidade")}</option>
          {cidades.map((cidade) => (
            <option key={cidade.codigo} value={cidade.codigo}>
              {cidade.nome}
            </option>
          ))}
        </select>
      </Campo>
    </div>
  )
}
