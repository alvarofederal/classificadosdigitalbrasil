// APLICAÇÃO — consultas de leitura (CQRS leve): DTOs prontos para a tela, sem regra de negócio.
// A infraestrutura implementa com Prisma; a apresentação só conhece estes contratos.

import type { EstiloDoAnuncio, Situacao, SituacaoExibida } from "@/domain/anuncio/anuncio"
import type { Categoria } from "@/domain/categoria/categoria"
import type { SituacaoDoPagamento } from "@/domain/pagamento/pagamento"
import type { Perfil } from "@/domain/usuario/usuario"

export interface Pagina<T> {
  itens: T[]
  total: number
  pagina: number
  porPagina: number
}

// ── Site público (RNF-01: sempre UMA cidade + UMA categoria) ──

export interface AnuncioPublicoDTO {
  id: string
  codigo: string
  titulo: string
  texto: string
  precoCentavos: number | null
  estilo: EstiloDoAnuncio
  fotos: Array<{ id: string; url: string }>
  uf: string
  cidadeCodigo: number
  categoriaNome: string
  categoriaSlug: string
  expiraEm: Date | null
}

export interface ClassificadosQuery {
  categoriasAtivas(): Promise<Categoria[]>
  /** categoriaId → anúncios no ar naquela cidade. */
  contagemPorCategoria(cidadeCodigo: number, agora: Date): Promise<Record<string, number>>
  anunciosDaCategoria(params: { cidadeCodigo: number; categoriaId: string; pagina: number; porPagina: number; agora: Date }): Promise<Pagina<AnuncioPublicoDTO>>
  /** Só devolve se o anúncio estiver no ar. */
  anuncioNoAr(codigo: string, agora: Date): Promise<AnuncioPublicoDTO | null>
  cidadesComAnuncios(agora: Date, limite: number): Promise<Array<{ uf: string; cidadeCodigo: number; total: number }>>
  combinacoesNoAr(agora: Date): Promise<Array<{ uf: string; cidadeCodigo: number; categoriaSlug: string }>>
}

// ── Área do anunciante ──

export interface PagamentoResumoDTO {
  id: string
  codigo: string
  valorCentavos: number
  dias: number
  situacao: SituacaoDoPagamento
  criadoEm: Date
  confirmadoEm: Date | null
}

export interface MeuAnuncioDTO {
  id: string
  codigo: string
  categoriaId: string
  categoriaNome: string
  categoriaSlug: string
  uf: string
  cidadeCodigo: number
  titulo: string
  texto: string
  precoCentavos: number | null
  estilo: EstiloDoAnuncio
  situacao: Situacao
  publicadoEm: Date | null
  expiraEm: Date | null
  criadoEm: Date
  fotos: Array<{ id: string; url: string }>
  mensagensNaoLidas: number
  totalMensagens: number
  pagamentoPendente: PagamentoResumoDTO | null
}

export interface MensagemDTO {
  id: string
  nome: string
  contato: string
  texto: string
  lida: boolean
  criadoEm: Date
}

export interface MeuAnuncioDetalheDTO extends MeuAnuncioDTO {
  mensagens: MensagemDTO[]
  pagamentos: PagamentoResumoDTO[]
}

export interface PerfilDTO {
  nome: string
  cpf: string | null
  email: string
  celular: string
  uf: string
  cidadeCodigo: number
  criadoEm: Date
}

export interface MinhaContaQuery {
  meusAnuncios(usuarioId: string): Promise<MeuAnuncioDTO[]>
  meuAnuncio(usuarioId: string, anuncioId: string): Promise<MeuAnuncioDetalheDTO | null>
  perfil(usuarioId: string): Promise<PerfilDTO | null>
}

// ── Painel do administrador ──

export interface ResumoDoPainelDTO {
  usuarios: number
  anunciosNoAr: number
  aguardandoPagamento: number
  pagamentosConfirmados: number
  valorRecebidoCentavos: number
}

export type FiltroDePagamento = "TODOS" | "PAGOS" | "PENDENTES" | "SEM_PAGAMENTO"

export interface UsuarioAdminDTO {
  id: string
  nome: string
  email: string
  celular: string
  uf: string
  cidadeCodigo: number
  perfil: Perfil
  ativo: boolean
  criadoEm: Date
  totalAnuncios: number
  pagamentosConfirmados: number
  valorPagoCentavos: number
  pagamentosPendentes: number
  ultimoPagamentoEm: Date | null
}

export interface FiltroDeAnuncios {
  pagina: number
  porPagina: number
  /** AAAA-MM-DD, no fuso de Brasília, aplicado à data de criação. */
  dataInicial: string | null
  dataFinal: string | null
  uf: string | null
  cidadeCodigo: number | null
  categoriaId: string | null
  situacao: SituacaoExibida | null
}

export interface AnuncioAdminDTO {
  id: string
  codigo: string
  titulo: string
  categoriaNome: string
  uf: string
  cidadeCodigo: number
  anuncianteNome: string
  anuncianteEmail: string
  situacao: Situacao
  publicadoEm: Date | null
  expiraEm: Date | null
  criadoEm: Date
  totalFotos: number
  pagamentoPendente: { id: string; codigo: string; valorCentavos: number } | null
}

export interface CategoriaAdminDTO extends Categoria {
  totalAnuncios: number
}

export interface PainelQuery {
  resumo(agora: Date): Promise<ResumoDoPainelDTO>
  usuarios(params: { pagina: number; porPagina: number; busca: string | null; pagamento: FiltroDePagamento }): Promise<Pagina<UsuarioAdminDTO>>
  anuncios(filtro: FiltroDeAnuncios, agora: Date): Promise<Pagina<AnuncioAdminDTO>>
  categorias(): Promise<CategoriaAdminDTO[]>
}
