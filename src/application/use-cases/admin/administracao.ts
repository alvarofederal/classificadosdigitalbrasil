// APLICAÇÃO — o que só o administrador faz: categorias e configuração (RF-30 a RF-32, RF-35).

import { type DadosDaCategoria, slugDaCategoria, validarCategoria } from "@/domain/categoria/categoria"
import { validarTabelaDePreco } from "@/domain/pagamento/pagamento"
import { validarRecebedorPix } from "@/domain/pagamento/pix"
import { type Result, falha, falhaDeValidacao, ok } from "@/domain/shared/result"
import type { CategoriaRepository, Configuracao, ConfiguracaoRepository } from "../../ports/caderno"

export class CriarCategoriaUseCase {
  constructor(private readonly categorias: CategoriaRepository) {}

  async executar(dados: DadosDaCategoria): Promise<Result<string>> {
    const nome = dados.nome.trim().replace(/\s+/g, " ")
    const erros = validarCategoria({ ...dados, nome })
    const slug = slugDaCategoria(nome)
    if (!erros.nome && (await this.categorias.existeSlug(slug))) erros.nome = "Já existe uma categoria com este nome."
    if (Object.keys(erros).length > 0) return falhaDeValidacao(erros)
    return ok(await this.categorias.inserir({ nome, slug, ordem: dados.ordem, ativa: dados.ativa }))
  }
}

export class AtualizarCategoriaUseCase {
  constructor(private readonly categorias: CategoriaRepository) {}

  /** O endereço (slug) acompanha o nome, para a seção continuar legível no link. */
  async executar(id: string, dados: DadosDaCategoria): Promise<Result<true>> {
    const atual = await this.categorias.buscarPorId(id)
    if (!atual) return falha("NAO_ENCONTRADO", "Categoria não encontrada.")
    const nome = dados.nome.trim().replace(/\s+/g, " ")
    const erros = validarCategoria({ ...dados, nome })
    const slug = slugDaCategoria(nome)
    if (!erros.nome && (await this.categorias.existeSlug(slug, id))) erros.nome = "Já existe uma categoria com este nome."
    if (Object.keys(erros).length > 0) return falhaDeValidacao(erros)
    await this.categorias.atualizar({ id, nome, slug, ordem: dados.ordem, ativa: dados.ativa })
    return ok(true)
  }
}

export class RemoverCategoriaUseCase {
  constructor(private readonly categorias: CategoriaRepository) {}

  /** RN-31: categoria com anúncios não se apaga — desativa-se. */
  async executar(id: string): Promise<Result<true>> {
    const atual = await this.categorias.buscarPorId(id)
    if (!atual) return falha("NAO_ENCONTRADO", "Categoria não encontrada.")
    const total = await this.categorias.contarAnuncios(id)
    if (total > 0) return falha("CATEGORIA_EM_USO", `Há ${total} anúncio(s) nesta categoria. Desative-a em vez de excluir.`)
    await this.categorias.remover(id)
    return ok(true)
  }
}

export class AtualizarConfiguracaoUseCase {
  constructor(private readonly configuracao: ConfiguracaoRepository) {}

  async executar(entrada: Configuracao): Promise<Result<true>> {
    const dados: Configuracao = {
      ...entrada,
      pixChave: entrada.pixChave.trim(),
      pixNome: entrada.pixNome.trim(),
      pixCidade: entrada.pixCidade.trim(),
    }
    const erros = validarTabelaDePreco(dados)
    // A chave pode ficar em branco (cobrança desligada); preenchida, precisa estar completa.
    if (dados.pixChave || dados.pixNome || dados.pixCidade) {
      validarRecebedorPix({ chave: dados.pixChave, nomeRecebedor: dados.pixNome, cidadeRecebedor: dados.pixCidade }, erros)
    }
    if (Object.keys(erros).length > 0) return falhaDeValidacao(erros)
    await this.configuracao.salvar(dados)
    return ok(true)
  }
}
