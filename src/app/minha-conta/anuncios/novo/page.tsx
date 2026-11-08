// APRESENTAÇÃO — novo anúncio (RF-10). Cidade e seção podem vir do link "Anunciar aqui".

import type { Metadata } from "next"
import { Faixa } from "@/components/jornal/pecas"
import { ESTILO_PADRAO } from "@/domain/anuncio/anuncio"
import { container } from "@/infrastructure/container"
import { formatarReais, plural } from "@/lib/formatadores"
import { parametro } from "@/lib/formularios"
import { exigirPerfil } from "@/lib/sessao"
import { EditorAnuncio } from "../../_componentes/editor-anuncio"
import { criarAnuncioAction } from "../../actions"

export const metadata: Metadata = { title: "Novo anúncio", robots: { index: false } }

type Busca = { uf?: string; cidade?: string; categoria?: string }

export default async function NovoAnuncio({ searchParams }: { searchParams: Promise<Busca> }) {
  const usuario = await exigirPerfil("ANUNCIANTE")
  const c = container()
  const [perfil, categorias, tabela] = await Promise.all([c.minhaConta.perfil(usuario.id), c.classificados.categoriasAtivas(), c.configuracao.obter()])
  const busca = await searchParams

  // Do link "Anunciar aqui" vem a cidade da seção; sem ele, a cidade do cadastro.
  const cidadeDoLink = Number(parametro(busca.cidade))
  const cidade = c.localidades.cidade(cidadeDoLink) ?? (perfil ? c.localidades.cidade(perfil.cidadeCodigo) : null)
  const categoria = categorias.find((cat) => cat.id === parametro(busca.categoria))

  return (
    <div className="flex flex-col gap-5">
      <Faixa como="h1">Novo anúncio</Faixa>
      <EditorAnuncio
        acao={criarAnuncioAction}
        categorias={categorias}
        iniciais={{
          categoriaId: categoria?.id ?? "",
          uf: cidade?.uf ?? "",
          cidadeCodigo: cidade?.codigo ?? 0,
          titulo: "",
          texto: "",
          preco: "",
          estilo: ESTILO_PADRAO,
        }}
        textoDoBotao="Salvar e gerar o Pix"
        aviso={`Ao salvar, o anúncio fica guardado e geramos o Pix de ${formatarReais(tabela.valorAnuncioCentavos)} para ${plural(tabela.diasDePublicacao, "dia", "dias")} no caderno. Depois você pode subir até 6 fotos no álbum.`}
      />
    </div>
  )
}
