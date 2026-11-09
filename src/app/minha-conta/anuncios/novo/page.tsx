// APRESENTAÇÃO — novo anúncio (RF-10, RF-52). Cidade e seção podem vir do link "Anunciar aqui".

import type { Metadata } from "next"
import { Faixa } from "@/components/jornal/pecas"
import { ESTILO_PADRAO } from "@/domain/anuncio/anuncio"
import { container } from "@/infrastructure/container"
import { parametro } from "@/lib/formularios"
import { exigirPerfil } from "@/lib/sessao"
import { EditorAnuncio } from "../../_componentes/editor-anuncio"
import { criarAnuncioAction } from "../../actions"

export const metadata: Metadata = { title: "Novo anúncio", robots: { index: false } }

type Busca = { uf?: string; cidade?: string; categoria?: string; plano?: string }

export default async function NovoAnuncio({ searchParams }: { searchParams: Promise<Busca> }) {
  const usuario = await exigirPerfil("ANUNCIANTE")
  const c = container()
  const [perfil, categorias, planos] = await Promise.all([c.minhaConta.perfil(usuario.id), c.classificados.categoriasAtivas(), c.classificados.planosAVenda()])
  const busca = await searchParams

  // Do link "Anunciar aqui" vem a cidade da seção; sem ele, a cidade do cadastro.
  const cidadeDoLink = Number(parametro(busca.cidade))
  const cidade = c.localidades.cidade(cidadeDoLink) ?? (perfil ? c.localidades.cidade(perfil.cidadeCodigo) : null)
  const categoria = categorias.find((cat) => cat.id === parametro(busca.categoria))
  const plano = planos.find((p) => p.codigo === parametro(busca.plano)) ?? planos[0]

  return (
    <div className="flex flex-col gap-5">
      <Faixa como="h1">Novo anúncio</Faixa>
      <EditorAnuncio
        acao={criarAnuncioAction}
        categorias={categorias}
        planos={planos}
        planoAtual={plano?.codigo}
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
        aviso={
          c.pixAutomatico
            ? "Ao salvar, geramos o Pix. Assim que ele for pago, o anúncio entra no caderno sozinho. Depois você pode subir as fotos do álbum."
            : "Ao salvar, geramos o Pix. O anúncio entra no caderno quando o pagamento for confirmado. Depois você pode subir as fotos do álbum."
        }
      />
    </div>
  )
}
