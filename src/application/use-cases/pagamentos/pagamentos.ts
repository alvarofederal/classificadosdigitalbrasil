// APLICAÇÃO — cobrança do espaço por plano, Pix automático e confirmação (RF-14, RF-15, RF-80 a RF-84; RN-12, RN-21, RN-22, RN-53, RN-54, RN-80, RN-81, RN-87 a RN-89).

import { fimQueContaNaRenovacao, novaExpiracao } from "@/domain/anuncio/anuncio"
import { ALFABETO_DO_PAGAMENTO, TAMANHO_DO_CODIGO_DE_PAGAMENTO, VALIDADE_DO_PIX_MS } from "@/domain/pagamento/pagamento"
import { gerarPixCopiaECola } from "@/domain/pagamento/pix"
import { ehCodigoDePlano, ehPeriodo, type Periodo, prioridadeDoPlano, valorDoPeriodo } from "@/domain/plano/plano"
import { type Result, falha, falhaDeValidacao, ok } from "@/domain/shared/result"
import type {
  AnuncioRegistro,
  AnuncioRepository,
  CancelamentoNoGateway,
  ConfiguracaoRepository,
  GatewayPix,
  PagamentoRegistro,
  PagamentoRepository,
  PlanoRepository,
} from "../../ports/caderno"
import type { GeradorDeCodigo, Relogio } from "../../ports/sistema"

export interface DepsDePagamento {
  pagamentos: PagamentoRepository
  planos: PlanoRepository
  codigos: GeradorDeCodigo
  relogio: Relogio
  /** null = sem credenciais: volta ao Pix estático com confirmação no painel (RF-83). */
  gateway: GatewayPix | null
}

export interface PedidoDeCobranca {
  anuncio: Pick<AnuncioRegistro, "id" | "usuarioId">
  planoCodigo: string
  dias: number
  emailDoPagador: string
}

/** Plano à venda e período com preço na grade do plano (RN-56). */
export async function conferirPlano(planos: PlanoRepository, planoCodigo: string, dias: number) {
  const erros: Record<string, string> = {}
  const plano = ehCodigoDePlano(planoCodigo) ? await planos.buscar(planoCodigo) : null
  if (!plano || !plano.ativo) erros.planoCodigo = "Escolha um plano disponível."
  // RN-56: o período precisa existir na grade do plano escolhido.
  if (!ehPeriodo(dias)) erros.dias = "Escolha 7, 10, 15, 20 ou 30 dias."
  else if (plano && !erros.planoCodigo && valorDoPeriodo(plano, dias) === null) erros.dias = "Este plano não tem esse período."
  return { plano, erros }
}

async function novoCodigo(deps: DepsDePagamento): Promise<string> {
  let codigo = deps.codigos.codigo(ALFABETO_DO_PAGAMENTO, TAMANHO_DO_CODIGO_DE_PAGAMENTO)
  while (await deps.pagamentos.existeCodigo(codigo)) codigo = deps.codigos.codigo(ALFABETO_DO_PAGAMENTO, TAMANHO_DO_CODIGO_DE_PAGAMENTO)
  return codigo
}

/**
 * RN-87: cobrança cancelada aqui deixa de ser pagável no gateway. Antes disso o Pix antigo seguia valendo por até
 * 24 horas e, se fosse pago, o dinheiro entrava sem publicar nada. Pix estático não tem o que cancelar lá.
 */
export async function cancelarNoGateway(
  gateway: GatewayPix | null,
  pagamento: Pick<PagamentoRegistro, "codigo" | "gateway" | "gatewayId">,
): Promise<CancelamentoNoGateway | "SEM_GATEWAY"> {
  if (!gateway || pagamento.gateway !== gateway.nome || !pagamento.gatewayId) return "SEM_GATEWAY"
  const resultado = await gateway.cancelar(pagamento.gatewayId)
  if (resultado === "FALHOU") {
    console.warn(`[pagamento] o gateway não cancelou a cobrança ${pagamento.codigo}: o Pix antigo segue pagável até vencer (RN-89).`)
  }
  return resultado
}

/**
 * RN-21: no máximo uma cobrança pendente por anúncio. Mesma escolha e Pix ainda válido: devolve a mesma.
 * Escolha diferente (ou Pix vencido): cancela a anterior e gera outra com o valor da tabela de agora (RN-53).
 */
export async function abrirCobranca(deps: DepsDePagamento, pedido: PedidoDeCobranca): Promise<Result<PagamentoRegistro>> {
  const { plano, erros } = await conferirPlano(deps.planos, pedido.planoCodigo, pedido.dias)
  if (!plano || Object.keys(erros).length > 0) return falhaDeValidacao(erros)
  const dias = pedido.dias as Periodo
  const agora = deps.relogio.agora()

  const pendente = await deps.pagamentos.pendenteDoAnuncio(pedido.anuncio.id)
  if (pendente) {
    const vencido = pendente.vencimentoEm !== null && pendente.vencimentoEm.getTime() <= agora.getTime()
    if (pendente.planoCodigo === plano.codigo && pendente.dias === dias && !vencido) return ok(pendente)
    // RN-87 e RN-88: o Pix antigo sai do gateway antes de nascer o novo; se já foi pago, nada é cancelado.
    if ((await cancelarNoGateway(deps.gateway, pendente)) === "JA_PAGA") {
      return falha("PIX_JA_PAGO", "O Pix desta cobrança já foi pago. A confirmação aparece em instantes; depois dela você pode escolher outro plano.")
    }
    await deps.pagamentos.cancelar(pendente.id)
  }

  const codigo = await novoCodigo(deps)
  const valorCentavos = valorDoPeriodo(plano, dias)!
  let doGateway: Pick<PagamentoRegistro, "gateway" | "gatewayId" | "copiaECola" | "vencimentoEm"> = {
    gateway: null,
    gatewayId: null,
    copiaECola: null,
    vencimentoEm: null,
  }
  if (deps.gateway) {
    try {
      const cobranca = await deps.gateway.criarCobranca({
        referencia: codigo,
        valorCentavos,
        descricao: `Classificados Digitais do Brasil - plano ${plano.nome}, ${dias} dias`,
        emailDoPagador: pedido.emailDoPagador,
        vencimentoEm: new Date(agora.getTime() + VALIDADE_DO_PIX_MS),
      })
      doGateway = { gateway: deps.gateway.nome, gatewayId: cobranca.gatewayId, copiaECola: cobranca.copiaECola, vencimentoEm: cobranca.vencimentoEm }
    } catch (erro) {
      // Gateway fora do ar não pode travar o anunciante: cai no Pix estático e o admin confirma.
      console.error("[pagamento] gateway indisponível, usando Pix estático", erro)
    }
  }

  const novo: Omit<PagamentoRegistro, "id"> = {
    codigo,
    anuncioId: pedido.anuncio.id,
    usuarioId: pedido.anuncio.usuarioId,
    planoCodigo: plano.codigo,
    valorCentavos,
    dias,
    situacao: "PENDENTE",
    ...doGateway,
    criadoEm: agora,
    confirmadoEm: null,
    confirmadoPorId: null,
  }
  const id = await deps.pagamentos.inserir(novo)
  return ok({ id, ...novo })
}

/** Anunciante escolhe plano e dias para renovar (ou trocar de plano) — RF-15, RF-52. */
export class SolicitarRenovacaoUseCase {
  constructor(
    private readonly anuncios: AnuncioRepository,
    private readonly deps: DepsDePagamento,
  ) {}

  async executar(entrada: { usuarioId: string; email: string; anuncioId: string; planoCodigo: string; dias: number }): Promise<Result<PagamentoRegistro>> {
    const anuncio = await this.anuncios.buscarPorId(entrada.anuncioId)
    if (!anuncio || anuncio.usuarioId !== entrada.usuarioId) return falha("NAO_ENCONTRADO", "Anúncio não encontrado.")
    if (anuncio.situacao === "REMOVIDO") return falha("ANUNCIO_REMOVIDO", "Este anúncio foi removido e não pode ser renovado.")
    return abrirCobranca(this.deps, { anuncio, planoCodigo: entrada.planoCodigo, dias: entrada.dias, emailDoPagador: entrada.email })
  }
}

/** Confirma a cobrança e publica: pelo admin (adminId) ou pelo gateway (adminId null) — RN-12, RN-22, RN-54. */
export class ConfirmarPagamentoUseCase {
  constructor(
    private readonly anuncios: AnuncioRepository,
    private readonly pagamentos: PagamentoRepository,
    private readonly relogio: Relogio,
  ) {}

  async executar(entrada: { pagamentoId: string; adminId: string | null }): Promise<Result<{ expiraEm: Date }>> {
    const pagamento = await this.pagamentos.buscarPorId(entrada.pagamentoId)
    if (!pagamento) return falha("NAO_ENCONTRADO", "Pagamento não encontrado.")
    if (pagamento.situacao !== "PENDENTE") return falha("JA_PROCESSADO", "Este pagamento já foi processado.")
    const anuncio = await this.anuncios.buscarPorId(pagamento.anuncioId)
    if (!anuncio) return falha("NAO_ENCONTRADO", "Anúncio não encontrado.")
    if (anuncio.situacao === "REMOVIDO") return falha("ANUNCIO_REMOVIDO", "O anúncio foi removido. Restaure-o antes de confirmar o pagamento.")

    const agora = this.relogio.agora()
    // RN-143: o desativado também aproveita o fim atual, e o pagamento o põe no ar.
    const expiraEm = novaExpiracao(fimQueContaNaRenovacao(anuncio.situacao, anuncio.expiraEm), agora, pagamento.dias)
    const confirmou = await this.pagamentos.confirmarEPublicar(
      { ...pagamento, situacao: "CONFIRMADO", confirmadoEm: agora, confirmadoPorId: entrada.adminId },
      {
        ...anuncio,
        situacao: "PUBLICADO",
        planoCodigo: pagamento.planoCodigo,
        prioridade: prioridadeDoPlano(pagamento.planoCodigo),
        publicadoEm: anuncio.publicadoEm ?? agora,
        expiraEm,
      },
    )
    if (!confirmou) return falha("JA_PROCESSADO", "Este pagamento já foi processado.")
    return ok({ expiraEm })
  }
}

export type ResultadoDoAviso = "CONFIRMADO" | "AINDA_PENDENTE" | "JA_PROCESSADO"

/**
 * Aviso do gateway (webhook) ou consulta do próprio anunciante: só confirma se o gateway diz aprovado,
 * a referência é uma cobrança nossa pendente e o valor pago é exatamente o cobrado (RN-80, RN-81).
 */
export class ProcessarPagamentoDoGatewayUseCase {
  constructor(
    private readonly pagamentos: PagamentoRepository,
    private readonly gateway: GatewayPix | null,
    private readonly confirmar: ConfirmarPagamentoUseCase,
  ) {}

  async executar(gatewayId: string): Promise<Result<ResultadoDoAviso>> {
    if (!this.gateway) return falha("SEM_GATEWAY", "Gateway de pagamento não configurado.")
    const noGateway = await this.gateway.consultar(gatewayId)
    if (noGateway.situacao !== "APROVADO") return ok("AINDA_PENDENTE")
    const pagamento = noGateway.referencia ? await this.pagamentos.buscarPorCodigo(noGateway.referencia) : null
    if (!pagamento) return falha("REFERENCIA_DESCONHECIDA", `Pagamento ${gatewayId} sem cobrança correspondente.`)
    if (pagamento.situacao === "CANCELADO") {
      // RN-89: o dinheiro entrou numa cobrança que já estava cancelada aqui. Nada é publicado; fica o registro para o admin.
      return falha(
        "PAGO_APOS_CANCELAMENTO",
        `A cobrança ${pagamento.codigo} foi paga depois de cancelada (ordem ${gatewayId}). Devolva o Pix no Mercado Pago ou publique o anúncio por cortesia.`,
      )
    }
    if (pagamento.situacao !== "PENDENTE") return ok("JA_PROCESSADO")
    if (noGateway.valorCentavos !== pagamento.valorCentavos) {
      return falha("VALOR_DIVERGENTE", `Cobrança ${pagamento.codigo}: esperado ${pagamento.valorCentavos}, pago ${noGateway.valorCentavos} (centavos).`)
    }
    const confirmado = await this.confirmar.executar({ pagamentoId: pagamento.id, adminId: null })
    if (!confirmado.ok) return confirmado.codigo === "JA_PROCESSADO" ? ok("JA_PROCESSADO") : confirmado
    return ok("CONFIRMADO")
  }
}

/** A tela de pagamento pergunta a cada 5 s se já caiu (RF-82); serve de reserva para webhook atrasado. */
export class VerificarPagamentoUseCase {
  constructor(
    private readonly anuncios: AnuncioRepository,
    private readonly pagamentos: PagamentoRepository,
    private readonly processar: ProcessarPagamentoDoGatewayUseCase,
  ) {}

  async executar(entrada: { usuarioId: string; anuncioId: string }): Promise<{ pago: boolean }> {
    const anuncio = await this.anuncios.buscarPorId(entrada.anuncioId)
    if (!anuncio || anuncio.usuarioId !== entrada.usuarioId) return { pago: false }
    const pendente = await this.pagamentos.pendenteDoAnuncio(anuncio.id)
    if (!pendente) return { pago: anuncio.situacao === "PUBLICADO" }
    if (!pendente.gatewayId) return { pago: false }
    const r = await this.processar.executar(pendente.gatewayId)
    return { pago: r.ok && (r.valor === "CONFIRMADO" || r.valor === "JA_PROCESSADO") }
  }
}

/** RF-84: admin publica sem cobrar (parceiros, anúncio-exemplo). Fica registrado como cortesia, valor zero. */
export class PublicarCortesiaUseCase {
  constructor(
    private readonly anuncios: AnuncioRepository,
    private readonly deps: DepsDePagamento,
    private readonly confirmar: ConfirmarPagamentoUseCase,
  ) {}

  async executar(entrada: { adminId: string; anuncioId: string; planoCodigo: string; dias: number }): Promise<Result<{ expiraEm: Date }>> {
    const anuncio = await this.anuncios.buscarPorId(entrada.anuncioId)
    if (!anuncio) return falha("NAO_ENCONTRADO", "Anúncio não encontrado.")
    if (anuncio.situacao === "REMOVIDO") return falha("ANUNCIO_REMOVIDO", "Restaure o anúncio antes de publicar.")
    const plano = ehCodigoDePlano(entrada.planoCodigo) ? await this.deps.planos.buscar(entrada.planoCodigo) : null
    if (!plano) return falhaDeValidacao({ planoCodigo: "Escolha o plano." })
    if (!Number.isInteger(entrada.dias) || entrada.dias < 1 || entrada.dias > 365) return falhaDeValidacao({ dias: "Entre 1 e 365 dias." })

    // RN-87 e RN-88: o Pix pendente sai do gateway; se o anunciante já pagou, a cortesia espera a confirmação.
    const pendente = await this.deps.pagamentos.pendenteDoAnuncio(anuncio.id)
    if (pendente && (await cancelarNoGateway(this.deps.gateway, pendente)) === "JA_PAGA") {
      return falha("PIX_JA_PAGO", "O anunciante já pagou o Pix deste anúncio. Aguarde a confirmação antes de dar a cortesia.")
    }
    await this.deps.pagamentos.cancelarPendentesDoAnuncio(anuncio.id)
    let codigo = this.deps.codigos.codigo(ALFABETO_DO_PAGAMENTO, TAMANHO_DO_CODIGO_DE_PAGAMENTO)
    while (await this.deps.pagamentos.existeCodigo(codigo)) codigo = this.deps.codigos.codigo(ALFABETO_DO_PAGAMENTO, TAMANHO_DO_CODIGO_DE_PAGAMENTO)
    const pagamentoId = await this.deps.pagamentos.inserir({
      codigo,
      anuncioId: anuncio.id,
      usuarioId: anuncio.usuarioId,
      planoCodigo: plano.codigo,
      valorCentavos: 0,
      dias: entrada.dias,
      situacao: "PENDENTE",
      gateway: "CORTESIA",
      gatewayId: null,
      copiaECola: null,
      vencimentoEm: null,
      criadoEm: this.deps.relogio.agora(),
      confirmadoEm: null,
      confirmadoPorId: null,
    })
    return this.confirmar.executar({ pagamentoId, adminId: entrada.adminId })
  }
}

export interface CobrancaPix {
  codigo: string
  planoCodigo: string
  valorCentavos: number
  dias: number
  /** Pix do gateway (dinâmico) ou estático da chave do admin; null quando nada está configurado. */
  copiaECola: string | null
  automatico: boolean
  vencimentoEm: Date | null
}

export class MontarCobrancaPixUseCase {
  constructor(private readonly configuracao: ConfiguracaoRepository) {}

  async executar(pagamento: Pick<PagamentoRegistro, "codigo" | "planoCodigo" | "valorCentavos" | "dias" | "copiaECola" | "vencimentoEm">): Promise<CobrancaPix> {
    const base = { codigo: pagamento.codigo, planoCodigo: pagamento.planoCodigo, valorCentavos: pagamento.valorCentavos, dias: pagamento.dias, vencimentoEm: pagamento.vencimentoEm }
    if (pagamento.copiaECola) return { ...base, copiaECola: pagamento.copiaECola, automatico: true }
    const cfg = await this.configuracao.obter()
    const configurado = cfg.pixChave && cfg.pixNome && cfg.pixCidade
    return {
      ...base,
      automatico: false,
      copiaECola: configurado
        ? gerarPixCopiaECola({
            chave: cfg.pixChave,
            nomeRecebedor: cfg.pixNome,
            cidadeRecebedor: cfg.pixCidade,
            valorCentavos: pagamento.valorCentavos,
            identificador: pagamento.codigo,
          })
        : null,
    }
  }
}
