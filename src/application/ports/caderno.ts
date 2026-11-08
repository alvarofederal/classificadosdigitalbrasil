// APLICAÇÃO — portas do caderno: categorias, anúncios, fotos, mensagens, pagamentos e configuração.

import type { EstiloDoAnuncio, Situacao } from "@/domain/anuncio/anuncio"
import type { Categoria } from "@/domain/categoria/categoria"
import type { NovaMensagem } from "@/domain/mensagem/mensagem"
import type { SituacaoDoPagamento, TabelaDePreco } from "@/domain/pagamento/pagamento"

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
  publicadoEm: Date | null
  expiraEm: Date | null
}

export interface AnuncioRepository {
  buscarPorId(id: string): Promise<AnuncioRegistro | null>
  existeCodigo(codigo: string): Promise<boolean>
  inserir(anuncio: Omit<AnuncioRegistro, "id">): Promise<string>
  atualizar(anuncio: AnuncioRegistro): Promise<void>
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
  valorCentavos: number
  dias: number
  situacao: SituacaoDoPagamento
  criadoEm: Date
  confirmadoEm: Date | null
  confirmadoPorId: string | null
}

export interface PagamentoRepository {
  buscarPorId(id: string): Promise<PagamentoRegistro | null>
  pendenteDoAnuncio(anuncioId: string): Promise<PagamentoRegistro | null>
  existeCodigo(codigo: string): Promise<boolean>
  inserir(pagamento: Omit<PagamentoRegistro, "id">): Promise<string>
  cancelarPendentesDoAnuncio(anuncioId: string): Promise<void>
  /** Confirma o pagamento e publica o anúncio na mesma transação (RN-22). */
  confirmarEPublicar(pagamento: PagamentoRegistro, anuncio: AnuncioRegistro): Promise<void>
}

// ── Configuração (tabela de preço e recebedor do Pix) ──

export interface Configuracao extends TabelaDePreco {
  pixChave: string
  pixNome: string
  pixCidade: string
}

export interface ConfiguracaoRepository {
  obter(): Promise<Configuracao>
  salvar(configuracao: Configuracao): Promise<void>
}
