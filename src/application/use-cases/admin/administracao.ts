// APLICAÇÃO — o que só o administrador faz: categorias, planos, configuração do Pix, chamados e teste do e-mail (RF-30 a RF-35, RF-51, RF-63, RF-103).

import { type DadosDaCategoria, slugDaCategoria, validarCategoria } from "@/domain/categoria/categoria"
import { montarEmailDeTeste } from "@/domain/mensagem/aviso"
import { validarRecebedorPix } from "@/domain/pagamento/pix"
import { type Plano, ehCodigoDePlano, validarPlano } from "@/domain/plano/plano"
import type { Destinatario } from "@/domain/shared/carta"
import { type Result, falha, falhaDeValidacao, ok } from "@/domain/shared/result"
import type { CategoriaRepository, ChamadoRepository, Configuracao, ConfiguracaoRepository, PlanoRepository } from "../../ports/caderno"
import type { Correio } from "../../ports/correio"
import type { Relogio } from "../../ports/sistema"

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

/** RF-51: o admin muda preços e textos; o código (e o que ele garante) é fixo (RN-55). */
export class AtualizarPlanoUseCase {
  constructor(private readonly planos: PlanoRepository) {}

  async executar(codigo: string, dados: Omit<Plano, "codigo">): Promise<Result<true>> {
    if (!ehCodigoDePlano(codigo) || !(await this.planos.buscar(codigo))) return falha("NAO_ENCONTRADO", "Plano não encontrado.")
    const limpo = { ...dados, nome: dados.nome.trim(), descricao: dados.descricao.trim() }
    const erros = validarPlano(limpo)
    if (Object.keys(erros).length > 0) return falhaDeValidacao(erros)
    await this.planos.salvar({ codigo, ...limpo })
    return ok(true)
  }
}

export class AtualizarConfiguracaoUseCase {
  constructor(private readonly configuracao: ConfiguracaoRepository) {}

  async executar(entrada: Configuracao): Promise<Result<true>> {
    const dados: Configuracao = { pixChave: entrada.pixChave.trim(), pixNome: entrada.pixNome.trim(), pixCidade: entrada.pixCidade.trim() }
    // A chave pode ficar em branco (Pix estático desligado); preenchida, precisa estar completa.
    const erros = dados.pixChave || dados.pixNome || dados.pixCidade ? validarRecebedorPix({ chave: dados.pixChave, nomeRecebedor: dados.pixNome, cidadeRecebedor: dados.pixCidade }) : {}
    if (Object.keys(erros).length > 0) return falhaDeValidacao(erros)
    await this.configuracao.salvar(dados)
    return ok(true)
  }
}

/** RF-63: marca o chamado como resolvido (ou reabre), com nota interna opcional. */
export class AtualizarChamadoUseCase {
  constructor(
    private readonly chamados: ChamadoRepository,
    private readonly relogio: Relogio,
  ) {}

  async executar(id: string, entrada: { resolvido: boolean; notaInterna: string | null }): Promise<Result<true>> {
    const chamado = await this.chamados.buscarPorId(id)
    if (!chamado) return falha("NAO_ENCONTRADO", "Chamado não encontrado.")
    const nota = entrada.notaInterna?.trim() || null
    if (nota && nota.length > 2000) return falhaDeValidacao({ notaInterna: "Nota com no máximo 2.000 caracteres." })
    await this.chamados.atualizar({
      ...chamado,
      notaInterna: nota,
      situacao: entrada.resolvido ? "RESOLVIDO" : "ABERTO",
      resolvidoEm: entrada.resolvido ? (chamado.resolvidoEm ?? this.relogio.agora()) : null,
    })
    return ok(true)
  }
}

/** RF-103: o admin manda um e-mail para si mesmo e vê na hora se o servidor de envio está certo. */
export class EnviarEmailDeTesteUseCase {
  constructor(private readonly correio: Correio) {}

  async executar(para: Destinatario): Promise<Result<true>> {
    if (!this.correio.ligado) return falha("SEM_CORREIO", "O servidor de e-mail ainda não está cadastrado na Vercel.")
    const envio = await this.correio.enviar(para, montarEmailDeTeste(para.nome))
    return envio.ok ? ok(true) : envio
  }
}
