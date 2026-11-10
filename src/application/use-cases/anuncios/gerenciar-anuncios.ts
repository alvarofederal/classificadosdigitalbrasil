// APLICAÇÃO — criar, editar, remover e restaurar anúncios (RF-10 a RF-13, RF-34, RN-10, RN-11, RN-14, RN-87).

import { ALFABETO_DO_CODIGO, type ConteudoDoAnuncio, TAMANHO_DO_CODIGO, normalizarConteudo, validarConteudo } from "@/domain/anuncio/anuncio"
import { type ErrosDeCampo, type Result, falha, falhaDeValidacao, ok } from "@/domain/shared/result"
import type { Perfil } from "@/domain/usuario/usuario"
import type { AnuncioRegistro, AnuncioRepository, CategoriaRepository, GatewayPix, PagamentoRepository } from "../../ports/caderno"
import type { Localidades } from "../../ports/localidades"
import type { GeradorDeCodigo } from "../../ports/sistema"
import { conferirCidade } from "../acesso/conta"
import { type DepsDePagamento, abrirCobranca, cancelarNoGateway, conferirPlano } from "../pagamentos/pagamentos"

export interface Ator {
  usuarioId: string
  perfil: Perfil
}

/** Dono do anúncio ou administrador. */
export function podeMexer(ator: Ator, anuncio: Pick<AnuncioRegistro, "usuarioId">): boolean {
  return ator.perfil === "ADMIN" || anuncio.usuarioId === ator.usuarioId
}

async function validarComCatalogos(
  conteudo: ConteudoDoAnuncio,
  categorias: CategoriaRepository,
  localidades: Localidades,
  categoriaAtual?: string,
): Promise<ErrosDeCampo> {
  const erros = validarConteudo(conteudo)
  conferirCidade(localidades, conteudo.uf, conteudo.cidadeCodigo, erros)
  if (!erros.categoriaId) {
    const categoria = await categorias.buscarPorId(conteudo.categoriaId)
    // Categoria desativada continua valendo para quem já anunciava nela (RN-31).
    if (!categoria || (!categoria.ativa && categoria.id !== categoriaAtual)) erros.categoriaId = "Escolha uma categoria disponível."
  }
  return erros
}

export class CriarAnuncioUseCase {
  constructor(
    private readonly anuncios: AnuncioRepository,
    private readonly categorias: CategoriaRepository,
    private readonly localidades: Localidades,
    private readonly codigos: GeradorDeCodigo,
    private readonly pagamento: DepsDePagamento,
  ) {}

  /** RN-10: nasce aguardando pagamento, já com a cobrança do plano e período escolhidos (RF-52). */
  async executar(
    usuario: { id: string; email: string },
    entrada: ConteudoDoAnuncio & { planoCodigo: string; dias: number },
  ): Promise<Result<{ anuncioId: string; codigo: string }>> {
    const { planoCodigo, dias, ...resto } = entrada
    const conteudo = normalizarConteudo(resto)
    const erros = await validarComCatalogos(conteudo, this.categorias, this.localidades)
    const { plano, erros: errosDoPlano } = await conferirPlano(this.pagamento.planos, planoCodigo, dias)
    Object.assign(erros, errosDoPlano)
    if (!plano || Object.keys(erros).length > 0) return falhaDeValidacao(erros)

    let codigo = this.codigos.codigo(ALFABETO_DO_CODIGO, TAMANHO_DO_CODIGO)
    while (await this.anuncios.existeCodigo(codigo)) codigo = this.codigos.codigo(ALFABETO_DO_CODIGO, TAMANHO_DO_CODIGO)

    const anuncioId = await this.anuncios.inserir({
      ...conteudo,
      codigo,
      usuarioId: usuario.id,
      situacao: "AGUARDANDO_PAGAMENTO",
      planoCodigo: plano.codigo,
      prioridade: 0,
      publicadoEm: null,
      expiraEm: null,
    })
    const cobranca = await abrirCobranca(this.pagamento, { anuncio: { id: anuncioId, usuarioId: usuario.id }, planoCodigo: plano.codigo, dias, emailDoPagador: usuario.email })
    if (!cobranca.ok) return cobranca
    return ok({ anuncioId, codigo })
  }
}

export class EditarAnuncioUseCase {
  constructor(
    private readonly anuncios: AnuncioRepository,
    private readonly categorias: CategoriaRepository,
    private readonly localidades: Localidades,
  ) {}

  /** RN-11: o texto e a formatação mudam a qualquer momento; o tempo no ar não muda. */
  async executar(ator: Ator, anuncioId: string, entrada: ConteudoDoAnuncio): Promise<Result<true>> {
    const anuncio = await this.anuncios.buscarPorId(anuncioId)
    if (!anuncio || !podeMexer(ator, anuncio)) return falha("NAO_ENCONTRADO", "Anúncio não encontrado.")
    if (anuncio.situacao === "REMOVIDO") return falha("ANUNCIO_REMOVIDO", "Anúncio removido não pode ser editado.")

    const conteudo = normalizarConteudo(entrada)
    const erros = await validarComCatalogos(conteudo, this.categorias, this.localidades, anuncio.categoriaId)
    if (Object.keys(erros).length > 0) return falhaDeValidacao(erros)

    await this.anuncios.atualizar({ ...anuncio, ...conteudo })
    return ok(true)
  }
}

export class RemoverAnuncioUseCase {
  constructor(
    private readonly anuncios: AnuncioRepository,
    private readonly pagamentos: PagamentoRepository,
    /** null = sem Pix automático: não há cobrança para cancelar no gateway. */
    private readonly gateway: GatewayPix | null,
  ) {}

  /** RN-14: sai do caderno na hora; o histórico de pagamentos fica. */
  async executar(ator: Ator, anuncioId: string): Promise<Result<true>> {
    const anuncio = await this.anuncios.buscarPorId(anuncioId)
    if (!anuncio || !podeMexer(ator, anuncio)) return falha("NAO_ENCONTRADO", "Anúncio não encontrado.")
    if (anuncio.situacao === "REMOVIDO") return ok(true)
    await this.anuncios.atualizar({ ...anuncio, situacao: "REMOVIDO" })
    // RN-87: o Pix pendente deixa de ser pagável no gateway. A remoção não depende disso.
    const pendente = await this.pagamentos.pendenteDoAnuncio(anuncio.id)
    if (pendente && (await cancelarNoGateway(this.gateway, pendente)) === "JA_PAGA") {
      console.warn(`[pagamento] anúncio ${anuncio.codigo} removido com o Pix da cobrança ${pendente.codigo} já pago: devolver no Mercado Pago, se for o caso.`)
    }
    await this.pagamentos.cancelarPendentesDoAnuncio(anuncio.id)
    return ok(true)
  }
}

/** RF-75: soma uma visita à página do anúncio (sem dados de quem visitou, RN-71). */
export class RegistrarVisitaUseCase {
  constructor(private readonly anuncios: AnuncioRepository) {}

  async executar(codigo: string): Promise<void> {
    await this.anuncios.somarVisita(codigo)
  }
}

export class RestaurarAnuncioUseCase {
  constructor(private readonly anuncios: AnuncioRepository) {}

  /** Só o admin desfaz uma remoção. Volta como publicado se já foi pago alguma vez. */
  async executar(ator: Ator, anuncioId: string): Promise<Result<true>> {
    if (ator.perfil !== "ADMIN") return falha("NAO_AUTORIZADO", "Só o administrador restaura anúncios.")
    const anuncio = await this.anuncios.buscarPorId(anuncioId)
    if (!anuncio) return falha("NAO_ENCONTRADO", "Anúncio não encontrado.")
    if (anuncio.situacao !== "REMOVIDO") return ok(true)
    await this.anuncios.atualizar({ ...anuncio, situacao: anuncio.publicadoEm ? "PUBLICADO" : "AGUARDANDO_PAGAMENTO" })
    return ok(true)
  }
}
