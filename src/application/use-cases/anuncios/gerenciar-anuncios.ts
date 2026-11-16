// APLICAÇÃO — criar, editar, desativar, ativar, remover e restaurar anúncios (RF-10 a RF-13, RF-34, RF-140, RN-10, RN-11, RN-14, RN-87, RN-140 a RN-145).

import {
  ALFABETO_DO_CODIGO,
  type ConteudoDoAnuncio,
  TAMANHO_DO_CODIGO,
  normalizarConteudo,
  podeAtivar,
  podeDesativar,
  validarConteudo,
} from "@/domain/anuncio/anuncio"
import { conferirUsoDoBanco, ehTipoDeDia } from "@/domain/banco/banco-de-dias"
import { type ErrosDeCampo, type Result, falha, falhaDeValidacao, ok } from "@/domain/shared/result"
import type { Perfil } from "@/domain/usuario/usuario"
import type { BancoDeDiasRepository } from "../../ports/banco"
import type { AnuncioRegistro, AnuncioRepository, CategoriaRepository, GatewayPix, PagamentoRepository } from "../../ports/caderno"
import type { UsarDiasDoBancoUseCase } from "../banco/banco-de-dias"
import type { Localidades } from "../../ports/localidades"
import type { GeradorDeCodigo, Relogio } from "../../ports/sistema"
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
    /** Feature 017 (RF-172): pagar com dias do banco em vez do Pix. */
    private readonly banco?: { repositorio: BancoDeDiasRepository; usar: UsarDiasDoBancoUseCase },
  ) {}

  /**
   * RN-10: nasce aguardando pagamento, já com a cobrança do plano e período escolhidos (RF-52).
   * Com `forma: "BANCO"`, nasce sem cobrança e vai ao ar na hora com os dias do banco (RF-172).
   */
  async executar(
    usuario: { id: string; email: string },
    entrada: ConteudoDoAnuncio & { planoCodigo: string; dias: number; forma?: "PIX" | "BANCO" },
  ): Promise<Result<{ anuncioId: string; codigo: string }>> {
    const { planoCodigo, dias, forma = "PIX", ...resto } = entrada
    const conteudo = normalizarConteudo(resto)
    const erros = await validarComCatalogos(conteudo, this.categorias, this.localidades)
    if (forma === "BANCO") return this.criarComDiasDoBanco(usuario, conteudo, planoCodigo, dias, erros)
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

  /** RF-172 e RN-171 a RN-173: confere o banco antes de gravar, para não deixar anúncio sem Pix e sem dias. */
  private async criarComDiasDoBanco(
    usuario: { id: string },
    conteudo: ConteudoDoAnuncio,
    tipo: string,
    dias: number,
    erros: ErrosDeCampo,
  ): Promise<Result<{ anuncioId: string; codigo: string }>> {
    if (!this.banco) return falha("SEM_BANCO", "O banco de dias não está disponível.")
    const saldo = await this.banco.repositorio.saldo(usuario.id)
    const novo = { situacao: "AGUARDANDO_PAGAMENTO" as const, planoCodigo: tipo, expiraEm: null }
    Object.assign(erros, conferirUsoDoBanco({ tipo, dias }, novo, saldo, this.pagamento.relogio.agora()))
    if (Object.keys(erros).length > 0 || !ehTipoDeDia(tipo)) return falhaDeValidacao(erros)

    const codigo = await this.novoCodigo()
    const anuncioId = await this.anuncios.inserir({
      ...conteudo,
      codigo,
      usuarioId: usuario.id,
      situacao: "AGUARDANDO_PAGAMENTO",
      planoCodigo: tipo,
      prioridade: 0,
      publicadoEm: null,
      expiraEm: null,
    })
    // Se o saldo mudou no meio do caminho, o anúncio fica salvo aguardando, e a tela dele oferece Pix ou banco de novo.
    const usado = await this.banco.usar.executar({ usuarioId: usuario.id, anuncioId, tipo, dias })
    if (!usado.ok) console.warn("[banco de dias] anúncio criado sem usar os dias", codigo, usado.codigo)
    return ok({ anuncioId, codigo })
  }

  private async novoCodigo(): Promise<string> {
    let codigo = this.codigos.codigo(ALFABETO_DO_CODIGO, TAMANHO_DO_CODIGO)
    while (await this.anuncios.existeCodigo(codigo)) codigo = this.codigos.codigo(ALFABETO_DO_CODIGO, TAMANHO_DO_CODIGO)
    return codigo
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

/** Feature 014: o dono (ou o admin) tira o anúncio do caderno por um tempo e o põe de volta. O prazo não para (RN-141). */
export class AtivarOuDesativarAnuncioUseCase {
  constructor(
    private readonly anuncios: AnuncioRepository,
    private readonly relogio: Relogio,
  ) {}

  async desativar(ator: Ator, anuncioId: string): Promise<Result<true>> {
    const anuncio = await this.anuncios.buscarPorId(anuncioId)
    if (!anuncio || !podeMexer(ator, anuncio)) return falha("NAO_ENCONTRADO", "Anúncio não encontrado.")
    if (anuncio.situacao === "DESATIVADO") return ok(true)
    if (!podeDesativar(anuncio.situacao, anuncio.expiraEm, this.relogio.agora())) {
      return falha("NAO_ESTA_NO_AR", "Só dá para desativar um anúncio que está no ar.")
    }
    await this.anuncios.atualizar({ ...anuncio, situacao: "DESATIVADO" })
    return ok(true)
  }

  async ativar(ator: Ator, anuncioId: string): Promise<Result<true>> {
    const anuncio = await this.anuncios.buscarPorId(anuncioId)
    if (!anuncio || !podeMexer(ator, anuncio)) return falha("NAO_ENCONTRADO", "Anúncio não encontrado.")
    if (anuncio.situacao === "PUBLICADO") return ok(true)
    if (!podeAtivar(anuncio.situacao, anuncio.expiraEm, this.relogio.agora())) {
      return falha(
        "SEM_PRAZO",
        anuncio.situacao === "DESATIVADO" ? "O prazo deste anúncio acabou. Renove para ele voltar ao caderno." : "Este anúncio não está desativado.",
      )
    }
    await this.anuncios.atualizar({ ...anuncio, situacao: "PUBLICADO" })
    return ok(true)
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
