// APLICAÇÃO — cobrança do espaço e confirmação do Pix (RF-14, RF-15, RF-33, RN-20 a RN-24).

import { type Situacao, novaExpiracao } from "@/domain/anuncio/anuncio"
import { ALFABETO_DO_PAGAMENTO, TAMANHO_DO_CODIGO_DE_PAGAMENTO } from "@/domain/pagamento/pagamento"
import { gerarPixCopiaECola } from "@/domain/pagamento/pix"
import { type Result, falha, ok } from "@/domain/shared/result"
import type { AnuncioRegistro, AnuncioRepository, ConfiguracaoRepository, PagamentoRegistro, PagamentoRepository } from "../../ports/caderno"
import type { GeradorDeCodigo, Relogio } from "../../ports/sistema"

export interface DepsDePagamento {
  pagamentos: PagamentoRepository
  configuracao: ConfiguracaoRepository
  codigos: GeradorDeCodigo
  relogio: Relogio
}

/** RN-21: um anúncio tem no máximo um pagamento pendente; o valor é o da tabela no momento da cobrança. */
export async function abrirCobranca(deps: DepsDePagamento, anuncio: Pick<AnuncioRegistro, "id" | "usuarioId">): Promise<PagamentoRegistro> {
  const pendente = await deps.pagamentos.pendenteDoAnuncio(anuncio.id)
  if (pendente) return pendente

  const tabela = await deps.configuracao.obter()
  let codigo = deps.codigos.codigo(ALFABETO_DO_PAGAMENTO, TAMANHO_DO_CODIGO_DE_PAGAMENTO)
  while (await deps.pagamentos.existeCodigo(codigo)) codigo = deps.codigos.codigo(ALFABETO_DO_PAGAMENTO, TAMANHO_DO_CODIGO_DE_PAGAMENTO)

  const novo: Omit<PagamentoRegistro, "id"> = {
    codigo,
    anuncioId: anuncio.id,
    usuarioId: anuncio.usuarioId,
    valorCentavos: tabela.valorAnuncioCentavos,
    dias: tabela.diasDePublicacao,
    situacao: "PENDENTE",
    criadoEm: deps.relogio.agora(),
    confirmadoEm: null,
    confirmadoPorId: null,
  }
  const id = await deps.pagamentos.inserir(novo)
  return { id, ...novo }
}

/** Anunciante pede mais dias (renovação) — gera a cobrança se ainda não houver uma. */
export class SolicitarRenovacaoUseCase {
  constructor(
    private readonly anuncios: AnuncioRepository,
    private readonly deps: DepsDePagamento,
  ) {}

  async executar(entrada: { usuarioId: string; anuncioId: string }): Promise<Result<PagamentoRegistro>> {
    const anuncio = await this.anuncios.buscarPorId(entrada.anuncioId)
    if (!anuncio || anuncio.usuarioId !== entrada.usuarioId) return falha("NAO_ENCONTRADO", "Anúncio não encontrado.")
    if (anuncio.situacao === "REMOVIDO") return falha("ANUNCIO_REMOVIDO", "Este anúncio foi removido e não pode ser renovado.")
    return ok(await abrirCobranca(this.deps, anuncio))
  }
}

/** Admin confirma que o Pix caiu: o anúncio vai ao ar (ou ganha mais dias) — RN-12, RN-22. */
export class ConfirmarPagamentoUseCase {
  constructor(
    private readonly anuncios: AnuncioRepository,
    private readonly pagamentos: PagamentoRepository,
    private readonly relogio: Relogio,
  ) {}

  async executar(entrada: { pagamentoId: string; adminId: string }): Promise<Result<{ expiraEm: Date }>> {
    const pagamento = await this.pagamentos.buscarPorId(entrada.pagamentoId)
    if (!pagamento) return falha("NAO_ENCONTRADO", "Pagamento não encontrado.")
    if (pagamento.situacao !== "PENDENTE") return falha("JA_PROCESSADO", "Este pagamento já foi processado.")
    const anuncio = await this.anuncios.buscarPorId(pagamento.anuncioId)
    if (!anuncio) return falha("NAO_ENCONTRADO", "Anúncio não encontrado.")
    if (anuncio.situacao === "REMOVIDO") return falha("ANUNCIO_REMOVIDO", "O anúncio foi removido. Restaure-o antes de confirmar o pagamento.")

    const agora = this.relogio.agora()
    const expiraEm = novaExpiracao(anuncio.situacao === "PUBLICADO" ? anuncio.expiraEm : null, agora, pagamento.dias)
    const situacao: Situacao = "PUBLICADO"
    await this.pagamentos.confirmarEPublicar(
      { ...pagamento, situacao: "CONFIRMADO", confirmadoEm: agora, confirmadoPorId: entrada.adminId },
      { ...anuncio, situacao, publicadoEm: anuncio.publicadoEm ?? agora, expiraEm },
    )
    return ok({ expiraEm })
  }
}

export interface CobrancaPix {
  codigo: string
  valorCentavos: number
  dias: number
  /** null quando o administrador ainda não configurou a chave Pix. */
  copiaECola: string | null
}

export class MontarCobrancaPixUseCase {
  constructor(private readonly configuracao: ConfiguracaoRepository) {}

  async executar(pagamento: Pick<PagamentoRegistro, "codigo" | "valorCentavos" | "dias">): Promise<CobrancaPix> {
    const cfg = await this.configuracao.obter()
    const configurado = cfg.pixChave && cfg.pixNome && cfg.pixCidade
    return {
      codigo: pagamento.codigo,
      valorCentavos: pagamento.valorCentavos,
      dias: pagamento.dias,
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
