// APLICAÇÃO — portas do caderno: categorias, planos, anúncios, fotos, mensagens, pagamentos, gateway, chamados e configuração.

import type { EstiloDoAnuncio, Situacao } from "@/domain/anuncio/anuncio"
import type { Categoria } from "@/domain/categoria/categoria"
import type { Assunto, SituacaoDoChamado } from "@/domain/chamado/chamado"
import type { NovaMensagem } from "@/domain/mensagem/mensagem"
import type { OrigemDoPagamento, SituacaoDoPagamento } from "@/domain/pagamento/pagamento"
import type { CodigoDoPlano, Plano } from "@/domain/plano/plano"

// ── Categorias ──

export interface CategoriaRepository {
  listar(): Promise<Categoria[]>
  buscarPorId(id: string): Promise<Categoria | null>
  existeSlug(slug: string, excetoId?: string): Promise<boolean>
  inserir(categoria: Omit<Categoria, "id">): Promise<string>
  atualizar(categoria: Categoria): Promise<void>
  remover(id: string): Promise<void>
  contarAnuncios(id: string): Promise<number>
}

// ── Planos (feature 003) ──

export interface PlanoRepository {
  listar(): Promise<Plano[]>
  buscar(codigo: string): Promise<Plano | null>
  salvar(plano: Plano): Promise<void>
}

// ── Anúncios ──

export interface AnuncioRegistro {
  id: string
  codigo: string
  usuarioId: string
  categoriaId: string
  uf: string
  cidadeCodigo: number
  titulo: string
  texto: string
  precoCentavos: number | null
  estilo: EstiloDoAnuncio
  situacao: Situacao
  planoCodigo: CodigoDoPlano
  prioridade: number
  publicadoEm: Date | null
  expiraEm: Date | null
}

export interface AnuncioRepository {
  buscarPorId(id: string): Promise<AnuncioRegistro | null>
  existeCodigo(codigo: string): Promise<boolean>
  inserir(anuncio: Omit<AnuncioRegistro, "id">): Promise<string>
  atualizar(anuncio: AnuncioRegistro): Promise<void>
  /** RF-75: soma uma visita, sem guardar nada de quem visitou. */
  somarVisita(codigo: string): Promise<void>
}

// ── Fotos (ADR-05: upload direto e assinado ao Cloudinary) ──

export interface FotoRegistro {
  id: string
  anuncioId: string
  url: string
  publicId: string
  ordem: number
}

export interface NovaFoto {
  url: string
  publicId: string
}

export interface FotoRepository {
  listar(anuncioId: string): Promise<FotoRegistro[]>
  adicionar(anuncioId: string, fotos: NovaFoto[]): Promise<void>
  reordenar(anuncioId: string, idsNaOrdem: string[]): Promise<void>
  remover(fotoId: string): Promise<void>
}

export interface AssinaturaDeUpload {
  url: string
  campos: Record<string, string>
}

export interface FotoStorage {
  pastaDoAnuncio(anuncioId: string): string
  assinarUploads(pasta: string, quantidade: number): AssinaturaDeUpload[]
  pertenceAPasta(foto: NovaFoto, pasta: string): boolean
  remover(publicIds: string[]): Promise<void>
}

// ── Mensagens ──

export interface MensagemRepository {
  inserir(anuncioId: string, mensagem: NovaMensagem): Promise<void>
  contarDoContatoDesde(anuncioId: string, contato: string, desde: Date): Promise<number>
  marcarComoLidas(anuncioId: string): Promise<void>
}

// ── Pagamentos ──

export interface PagamentoRegistro {
  id: string
  codigo: string
  anuncioId: string
  usuarioId: string
  planoCodigo: CodigoDoPlano
  valorCentavos: number
  dias: number
  situacao: SituacaoDoPagamento
  gateway: OrigemDoPagamento
  gatewayId: string | null
  copiaECola: string | null
  vencimentoEm: Date | null
  criadoEm: Date
  confirmadoEm: Date | null
  confirmadoPorId: string | null
}

export interface PagamentoRepository {
  buscarPorId(id: string): Promise<PagamentoRegistro | null>
  buscarPorCodigo(codigo: string): Promise<PagamentoRegistro | null>
  pendenteDoAnuncio(anuncioId: string): Promise<PagamentoRegistro | null>
  existeCodigo(codigo: string): Promise<boolean>
  inserir(pagamento: Omit<PagamentoRegistro, "id">): Promise<string>
  cancelar(pagamentoId: string): Promise<void>
  cancelarPendentesDoAnuncio(anuncioId: string): Promise<void>
  /**
   * Confirma o pagamento e publica o anúncio na mesma transação (RN-22).
   * Devolve false se o pagamento já não estava pendente (RN-81: aviso repetido não confirma duas vezes).
   */
  confirmarEPublicar(pagamento: PagamentoRegistro, anuncio: AnuncioRegistro): Promise<boolean>
}

// ── Gateway de Pix automático (feature 006, ADR-12) ──

export interface CobrancaNoGateway {
  gatewayId: string
  copiaECola: string
  vencimentoEm: Date
}

export type SituacaoNoGateway = "APROVADO" | "PENDENTE" | "RECUSADO"

export interface PagamentoNoGateway {
  gatewayId: string
  situacao: SituacaoNoGateway
  valorCentavos: number
  /** O código da nossa cobrança, enviado como referência externa. */
  referencia: string | null
}

export interface GatewayPix {
  readonly nome: "MERCADO_PAGO"
  criarCobranca(params: { referencia: string; valorCentavos: number; descricao: string; emailDoPagador: string; vencimentoEm: Date }): Promise<CobrancaNoGateway>
  consultar(gatewayId: string): Promise<PagamentoNoGateway>
}

// ── Chamados (feature 004) ──

export interface ChamadoRegistro {
  id: string
  protocolo: string
  nome: string
  email: string
  telefone: string
  assunto: Assunto
  mensagem: string
  anuncioCodigo: string | null
  situacao: SituacaoDoChamado
  notaInterna: string | null
  criadoEm: Date
  resolvidoEm: Date | null
}

export interface ChamadoRepository {
  inserir(chamado: Omit<ChamadoRegistro, "id">): Promise<string>
  existeProtocolo(protocolo: string): Promise<boolean>
  contarDoEmailDesde(email: string, desde: Date): Promise<number>
  buscarPorId(id: string): Promise<ChamadoRegistro | null>
  atualizar(chamado: ChamadoRegistro): Promise<void>
}

// ── Configuração (recebedor do Pix estático) ──

export interface Configuracao {
  pixChave: string
  pixNome: string
  pixCidade: string
}

export interface ConfiguracaoRepository {
  obter(): Promise<Configuracao>
  salvar(configuracao: Configuracao): Promise<void>
}
