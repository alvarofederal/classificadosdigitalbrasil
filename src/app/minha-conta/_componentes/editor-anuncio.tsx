"use client"

// APRESENTAÇÃO — editor do anúncio com a cara do anúncio: o quadrado ao lado muda enquanto se escreve (RF-10, RF-12).

import { Images, MessageSquare } from "lucide-react"
import { useState } from "react"
import { BotaoEnviar, Campo, MensagemFormulario, aria, useFormularioAcao } from "@/components/formulario"
import { CaixaAnuncio } from "@/components/jornal/caixa-anuncio"
import { SeletorLocalidade } from "@/components/seletor-localidade"
import {
  ALINHAMENTOS,
  ESTILOS_DE_TITULO,
  type EstiloDoAnuncio,
  LIMITES_DO_ANUNCIO,
  MOLDURAS,
} from "@/domain/anuncio/anuncio"
import { type Periodo, type Plano, planoTemDestaque } from "@/domain/plano/plano"
import { centavosDeTextoEmReais } from "@/domain/shared/dinheiro"
import type { EstadoFormulario } from "@/lib/formularios"
import { cn } from "@/lib/utils"
import { EscolhaDePlano } from "./escolha-de-plano"

export interface ValoresDoEditor {
  categoriaId: string
  uf: string
  cidadeCodigo: number
  titulo: string
  texto: string
  preco: string
  estilo: EstiloDoAnuncio
}

export function EditorAnuncio({
  acao,
  categorias,
  iniciais,
  textoDoBotao,
  aviso,
  totalFotos = 0,
  codigo,
  planos,
  planoAtual = "SIMPLES",
}: {
  acao: (formData: FormData) => Promise<EstadoFormulario>
  categorias: Array<{ id: string; nome: string }>
  iniciais: ValoresDoEditor
  textoDoBotao: string
  aviso?: string
  totalFotos?: number
  codigo?: string
  /** Só no anúncio novo: escolha de plano e período (feature 003). */
  planos?: Plano[]
  planoAtual?: string
}) {
  const [titulo, setTitulo] = useState(iniciais.titulo)
  const [texto, setTexto] = useState(iniciais.texto)
  const [preco, setPreco] = useState(iniciais.preco)
  const [estilo, setEstilo] = useState<EstiloDoAnuncio>(iniciais.estilo)
  const [categoriaId, setCategoriaId] = useState(iniciais.categoriaId)
  const [plano, setPlano] = useState(planoAtual)
  const [dias, setDias] = useState<Periodo>(7)
  const categoriaNome = categorias.find((c) => c.id === categoriaId)?.nome
  const { estado, pendente, onSubmit, formRef, erro } = useFormularioAcao(acao)

  const precoCentavos = preco.trim() ? centavosDeTextoEmReais(preco.trim()) : null
  const mudarEstilo = <K extends keyof EstiloDoAnuncio>(chave: K, valor: EstiloDoAnuncio[K]) => setEstilo((atual) => ({ ...atual, [chave]: valor }))

  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]" noValidate>
      <div className="flex flex-col gap-4">
        <MensagemFormulario estado={estado} />

        <Campo rotulo="Seção" nome="categoriaId" erro={erro("categoriaId")} obrigatorio>
          <select {...aria("categoriaId", erro("categoriaId"))} className="campo" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
            <option value="">Escolha a seção do caderno</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </Campo>

        <SeletorLocalidade
          ufInicial={iniciais.uf}
          cidadeInicial={iniciais.cidadeCodigo}
          erroUf={erro("uf")}
          erroCidade={erro("cidadeCodigo")}
          obrigatorio
          rotuloCidade="Cidade do anúncio"
        />

        <Campo
          rotulo="Título"
          nome="titulo"
          erro={erro("titulo")}
          obrigatorio
          dica={`${titulo.length}/${LIMITES_DO_ANUNCIO.tituloMax} · sai em letras maiúsculas, como no jornal`}
        >
          <input
            {...aria("titulo", erro("titulo"))}
            className="campo uppercase"
            maxLength={LIMITES_DO_ANUNCIO.tituloMax}
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="VENDO GOL 2010"
          />
        </Campo>

        <Campo rotulo="Texto" nome="texto" erro={erro("texto")} obrigatorio dica={`${texto.length}/${LIMITES_DO_ANUNCIO.textoMax} caracteres`}>
          <textarea
            {...aria("texto", erro("texto"))}
            className="campo min-h-32"
            maxLength={LIMITES_DO_ANUNCIO.textoMax}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Completo, 4 portas, revisado, IPVA pago. Bairro Centro."
          />
        </Campo>

        <Campo rotulo="Preço (opcional)" nome="preco" erro={erro("preco")} dica="Ex.: 22.000,00. Deixe em branco para não mostrar.">
          <input {...aria("preco", erro("preco"))} className="campo" inputMode="decimal" value={preco} onChange={(e) => setPreco(e.target.value)} placeholder="0,00" />
        </Campo>

        <fieldset className="flex flex-col gap-4 border border-fio p-4">
          <legend className="rotulo px-1">Formatação</legend>
          <Opcoes nome="moldura" rotulo="Moldura" opcoes={MOLDURAS} valor={estilo.moldura} aoMudar={(v) => mudarEstilo("moldura", v)} />
          <Opcoes nome="estiloTitulo" rotulo="Título" opcoes={ESTILOS_DE_TITULO} valor={estilo.estiloTitulo} aoMudar={(v) => mudarEstilo("estiloTitulo", v)} />
          <Opcoes nome="alinhamento" rotulo="Alinhamento" opcoes={ALINHAMENTOS} valor={estilo.alinhamento} aoMudar={(v) => mudarEstilo("alinhamento", v)} />
          <label className="flex items-center gap-2">
            <input type="checkbox" name="estrelas" checked={estilo.estrelas} onChange={(e) => mudarEstilo("estrelas", e.target.checked)} className="size-4 accent-tinta" />
            <span className="rotulo">Estrelas ★ ★ ★ acima e abaixo</span>
          </label>
        </fieldset>

        {planos && planos.length > 0 && (
          <EscolhaDePlano planos={planos} plano={plano} dias={dias} aoMudarPlano={setPlano} aoMudarDias={setDias} erroPlano={erro("planoCodigo")} erroDias={erro("dias")} />
        )}

        {aviso && <p className="border border-tinta bg-papel-escuro px-3 py-2 text-sm">{aviso}</p>}
        <BotaoEnviar pendente={pendente} className="self-start">
          {textoDoBotao}
        </BotaoEnviar>
      </div>

      <aside className="lg:sticky lg:top-4 lg:self-start" aria-label="Prévia do anúncio">
        <p className="rotulo mb-2">Prévia no caderno</p>
        {/* Mesma largura de uma coluna do caderno: o anúncio aparece aqui do tamanho que vai sair. */}
        <div className="mx-auto w-[15.5rem] border border-dashed border-tinta/40 p-2">
          <p className="tarja-secao mb-2 text-sm">{categoriaNome || "Seção"}</p>
          <CaixaAnuncio
            destaque={planoTemDestaque(plano)}
            conteudo={{ titulo, texto, precoCentavos, estilo }}
            rodape={
              <div className="flex min-h-7 items-center justify-between gap-1 font-titulo text-[0.62rem] font-semibold uppercase" aria-hidden>
                <span className="inline-flex items-center gap-1">
                  <MessageSquare className="size-3.5" />
                  Msg
                </span>
                <span className="text-[0.58rem] tracking-wider text-tinta-suave">Cód. {codigo ?? "······"}</span>
                <span className={cn("inline-flex items-center gap-0.5", totalFotos === 0 && "opacity-30")}>
                  <Images className="size-3.5" />
                  {totalFotos}
                </span>
              </div>
            }
          />
        </div>
        <p className="mt-2 text-xs text-tinta-suave">
          O botão de mensagem abre uma caixa para o interessado deixar nome e contato. O álbum aparece quando o anúncio tem fotos.
        </p>
      </aside>
    </form>
  )
}

function Opcoes<T extends string>({
  nome,
  rotulo,
  opcoes,
  valor,
  aoMudar,
}: {
  nome: string
  rotulo: string
  opcoes: Record<T, string>
  valor: T
  aoMudar: (valor: T) => void
}) {
  return (
    <div role="radiogroup" aria-label={rotulo} className="flex flex-col gap-1.5">
      <span className="rotulo">{rotulo}</span>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(opcoes) as T[]).map((chave) => (
          <label
            key={chave}
            className={cn(
              "cursor-pointer border px-3 py-1.5 text-sm has-[:focus-visible]:outline has-[:focus-visible]:outline-2",
              valor === chave ? "border-tinta bg-tinta text-papel" : "border-fio bg-papel-claro hover:bg-papel-escuro",
            )}
          >
            <input type="radio" name={nome} value={chave} checked={valor === chave} onChange={() => aoMudar(chave)} className="sr-only" />
            {opcoes[chave]}
          </label>
        ))}
      </div>
    </div>
  )
}
