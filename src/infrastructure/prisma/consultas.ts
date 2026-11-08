// INFRAESTRUTURA — consultas de leitura com Prisma (implementam src/application/queries/consultas.ts).

import type {
  AnuncioAdminDTO,
  AnuncioPublicoDTO,
  CategoriaAdminDTO,
  ClassificadosQuery,
  FiltroDeAnuncios,
  FiltroDePagamento,
  MeuAnuncioDTO,
  MeuAnuncioDetalheDTO,
  MinhaContaQuery,
  Pagina,
  PainelQuery,
  PagamentoResumoDTO,
  PerfilDTO,
  ResumoDoPainelDTO,
  UsuarioAdminDTO,
} from "@/application/queries/consultas"
import type { Categoria } from "@/domain/categoria/categoria"
import type { Pagamento, Prisma, PrismaClient } from "@/generated/prisma"
import { centavos, noAr } from "./mapeadores"

const FOTOS = { select: { id: true, url: true }, orderBy: [{ ordem: "asc" as const }, { criadoEm: "asc" as const }] }

const SELECAO_PUBLICA = {
  id: true,
  codigo: true,
  titulo: true,
  texto: true,
  preco: true,
  moldura: true,
  estiloTitulo: true,
  alinhamento: true,
  estrelas: true,
  uf: true,
  cidadeCodigo: true,
  expiraEm: true,
  categoria: { select: { nome: true, slug: true } },
  fotos: FOTOS,
} satisfies Prisma.AnuncioSelect

type LinhaPublica = Prisma.AnuncioGetPayload<{ select: typeof SELECAO_PUBLICA }>

function paraPublico(linha: LinhaPublica): AnuncioPublicoDTO {
  return {
    id: linha.id,
    codigo: linha.codigo,
    titulo: linha.titulo,
    texto: linha.texto,
    precoCentavos: centavos(linha.preco),
    estilo: { moldura: linha.moldura, estiloTitulo: linha.estiloTitulo, alinhamento: linha.alinhamento, estrelas: linha.estrelas },
    fotos: linha.fotos,
    uf: linha.uf,
    cidadeCodigo: linha.cidadeCodigo,
    categoriaNome: linha.categoria.nome,
    categoriaSlug: linha.categoria.slug,
    expiraEm: linha.expiraEm,
  }
}

function paraPagamentoResumo(linha: Pagamento): PagamentoResumoDTO {
  return {
    id: linha.id,
    codigo: linha.codigo,
    valorCentavos: centavos(linha.valor) ?? 0,
    dias: linha.dias,
    situacao: linha.situacao,
    criadoEm: linha.criadoEm,
    confirmadoEm: linha.confirmadoEm,
  }
}

/** "2026-11-08" no fuso de Brasília (UTC−3, sem horário de verão desde 2019) → instante UTC. */
function inicioDoDia(data: string): Date {
  return new Date(`${data}T00:00:00-03:00`)
}

export class PrismaClassificadosQuery implements ClassificadosQuery {
  constructor(private readonly db: PrismaClient) {}

  async categoriasAtivas(): Promise<Categoria[]> {
    return this.db.categoria.findMany({
      where: { ativa: true },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
      select: { id: true, nome: true, slug: true, ordem: true, ativa: true },
    })
  }

  async contagemPorCategoria(cidadeCodigo: number, agora: Date) {
    const grupos = await this.db.anuncio.groupBy({ by: ["categoriaId"], where: { cidadeCodigo, ...noAr(agora) }, _count: { _all: true } })
    return Object.fromEntries(grupos.map((g) => [g.categoriaId, g._count._all]))
  }

  async anunciosDaCategoria(params: { cidadeCodigo: number; categoriaId: string; pagina: number; porPagina: number; agora: Date }): Promise<Pagina<AnuncioPublicoDTO>> {
    const where = { cidadeCodigo: params.cidadeCodigo, categoriaId: params.categoriaId, ...noAr(params.agora) }
    const [linhas, total] = await Promise.all([
      this.db.anuncio.findMany({
        where,
        // Quem pagou por último aparece primeiro: a expiração mais distante é o pagamento mais recente.
        orderBy: [{ expiraEm: "desc" }, { id: "asc" }],
        skip: (params.pagina - 1) * params.porPagina,
        take: params.porPagina,
        select: SELECAO_PUBLICA,
      }),
      this.db.anuncio.count({ where }),
    ])
    return { itens: linhas.map(paraPublico), total, pagina: params.pagina, porPagina: params.porPagina }
  }

  async anuncioNoAr(codigo: string, agora: Date) {
    const linha = await this.db.anuncio.findFirst({ where: { codigo, ...noAr(agora) }, select: SELECAO_PUBLICA })
    return linha ? paraPublico(linha) : null
  }

  async cidadesComAnuncios(agora: Date, limite: number) {
    const grupos = await this.db.anuncio.groupBy({
      by: ["uf", "cidadeCodigo"],
      where: noAr(agora),
      _count: { _all: true },
      orderBy: { _count: { cidadeCodigo: "desc" } },
      take: limite,
    })
    return grupos.map((g) => ({ uf: g.uf, cidadeCodigo: g.cidadeCodigo, total: g._count._all }))
  }

  async combinacoesNoAr(agora: Date) {
    const [grupos, categorias] = await Promise.all([
      this.db.anuncio.groupBy({ by: ["uf", "cidadeCodigo", "categoriaId"], where: noAr(agora) }),
      this.db.categoria.findMany({ select: { id: true, slug: true } }),
    ])
    const slugs = new Map(categorias.map((c) => [c.id, c.slug]))
    return grupos.flatMap((g) => {
      const categoriaSlug = slugs.get(g.categoriaId)
      return categoriaSlug ? [{ uf: g.uf, cidadeCodigo: g.cidadeCodigo, categoriaSlug }] : []
    })
  }
}

const SELECAO_MEU_ANUNCIO = {
  id: true,
  codigo: true,
  categoriaId: true,
  uf: true,
  cidadeCodigo: true,
  titulo: true,
  texto: true,
  preco: true,
  moldura: true,
  estiloTitulo: true,
  alinhamento: true,
  estrelas: true,
  situacao: true,
  publicadoEm: true,
  expiraEm: true,
  criadoEm: true,
  categoria: { select: { nome: true, slug: true } },
  fotos: FOTOS,
  mensagens: { select: { lida: true } },
  pagamentos: { where: { situacao: "PENDENTE" as const }, orderBy: { criadoEm: "desc" as const }, take: 1 },
} satisfies Prisma.AnuncioSelect

type LinhaMeuAnuncio = Prisma.AnuncioGetPayload<{ select: typeof SELECAO_MEU_ANUNCIO }>

function paraMeuAnuncio(linha: LinhaMeuAnuncio): MeuAnuncioDTO {
  return {
    id: linha.id,
    codigo: linha.codigo,
    categoriaId: linha.categoriaId,
    categoriaNome: linha.categoria.nome,
    categoriaSlug: linha.categoria.slug,
    uf: linha.uf,
    cidadeCodigo: linha.cidadeCodigo,
    titulo: linha.titulo,
    texto: linha.texto,
    precoCentavos: centavos(linha.preco),
    estilo: { moldura: linha.moldura, estiloTitulo: linha.estiloTitulo, alinhamento: linha.alinhamento, estrelas: linha.estrelas },
    situacao: linha.situacao,
    publicadoEm: linha.publicadoEm,
    expiraEm: linha.expiraEm,
    criadoEm: linha.criadoEm,
    fotos: linha.fotos,
    mensagensNaoLidas: linha.mensagens.filter((m) => !m.lida).length,
    totalMensagens: linha.mensagens.length,
    pagamentoPendente: linha.pagamentos[0] ? paraPagamentoResumo(linha.pagamentos[0]) : null,
  }
}

export class PrismaMinhaContaQuery implements MinhaContaQuery {
  constructor(private readonly db: PrismaClient) {}

  async meusAnuncios(usuarioId: string) {
    const linhas = await this.db.anuncio.findMany({
      where: { usuarioId, situacao: { not: "REMOVIDO" } },
      orderBy: { criadoEm: "desc" },
      select: SELECAO_MEU_ANUNCIO,
    })
    return linhas.map(paraMeuAnuncio)
  }

  async meuAnuncio(usuarioId: string, anuncioId: string): Promise<MeuAnuncioDetalheDTO | null> {
    const linha = await this.db.anuncio.findFirst({
      where: { id: anuncioId, usuarioId, situacao: { not: "REMOVIDO" } },
      select: {
        ...SELECAO_MEU_ANUNCIO,
        mensagens: { orderBy: { criadoEm: "desc" }, select: { id: true, nome: true, contato: true, texto: true, lida: true, criadoEm: true } },
      },
    })
    if (!linha) return null
    const historico = await this.db.pagamento.findMany({ where: { anuncioId }, orderBy: { criadoEm: "desc" } })
    return { ...paraMeuAnuncio(linha), mensagens: linha.mensagens, pagamentos: historico.map(paraPagamentoResumo) }
  }

  async perfil(usuarioId: string): Promise<PerfilDTO | null> {
    return this.db.usuario.findUnique({
      where: { id: usuarioId },
      select: { nome: true, cpf: true, email: true, celular: true, uf: true, cidadeCodigo: true, criadoEm: true },
    })
  }
}

export class PrismaPainelQuery implements PainelQuery {
  constructor(private readonly db: PrismaClient) {}

  async resumo(agora: Date): Promise<ResumoDoPainelDTO> {
    const [usuarios, anunciosNoAr, aguardandoPagamento, confirmados] = await Promise.all([
      this.db.usuario.count({ where: { perfil: "ANUNCIANTE" } }),
      this.db.anuncio.count({ where: noAr(agora) }),
      this.db.anuncio.count({ where: { situacao: "AGUARDANDO_PAGAMENTO" } }),
      this.db.pagamento.aggregate({ where: { situacao: "CONFIRMADO" }, _count: { _all: true }, _sum: { valor: true } }),
    ])
    return {
      usuarios,
      anunciosNoAr,
      aguardandoPagamento,
      pagamentosConfirmados: confirmados._count._all,
      valorRecebidoCentavos: centavos(confirmados._sum.valor) ?? 0,
    }
  }

  async usuarios(params: { pagina: number; porPagina: number; busca: string | null; pagamento: FiltroDePagamento }): Promise<Pagina<UsuarioAdminDTO>> {
    const filtroPagamento: Prisma.UsuarioWhereInput =
      params.pagamento === "PAGOS"
        ? { pagamentos: { some: { situacao: "CONFIRMADO" } } }
        : params.pagamento === "PENDENTES"
          ? { pagamentos: { some: { situacao: "PENDENTE" } } }
          : params.pagamento === "SEM_PAGAMENTO"
            ? { pagamentos: { none: { situacao: "CONFIRMADO" } } }
            : {}
    const where: Prisma.UsuarioWhereInput = {
      ...filtroPagamento,
      ...(params.busca ? { OR: [{ nome: { contains: params.busca } }, { email: { contains: params.busca } }] } : {}),
    }
    const [linhas, total] = await Promise.all([
      this.db.usuario.findMany({
        where,
        orderBy: { criadoEm: "desc" },
        skip: (params.pagina - 1) * params.porPagina,
        take: params.porPagina,
        select: {
          id: true,
          nome: true,
          email: true,
          celular: true,
          uf: true,
          cidadeCodigo: true,
          perfil: true,
          ativo: true,
          criadoEm: true,
          _count: { select: { anuncios: true } },
          pagamentos: { where: { situacao: { in: ["CONFIRMADO", "PENDENTE"] } }, select: { situacao: true, valor: true, confirmadoEm: true } },
        },
      }),
      this.db.usuario.count({ where }),
    ])
    const itens = linhas.map(({ _count, pagamentos, ...usuario }) => {
      const confirmados = pagamentos.filter((p) => p.situacao === "CONFIRMADO")
      const datas = confirmados.map((p) => p.confirmadoEm?.getTime() ?? 0).filter(Boolean)
      return {
        ...usuario,
        totalAnuncios: _count.anuncios,
        pagamentosConfirmados: confirmados.length,
        valorPagoCentavos: confirmados.reduce((soma, p) => soma + (centavos(p.valor) ?? 0), 0),
        pagamentosPendentes: pagamentos.length - confirmados.length,
        ultimoPagamentoEm: datas.length > 0 ? new Date(Math.max(...datas)) : null,
      }
    })
    return { itens, total, pagina: params.pagina, porPagina: params.porPagina }
  }

  async anuncios(filtro: FiltroDeAnuncios, agora: Date): Promise<Pagina<AnuncioAdminDTO>> {
    const situacao: Prisma.AnuncioWhereInput =
      filtro.situacao === "NO_AR"
        ? noAr(agora)
        : filtro.situacao === "EXPIRADO"
          ? { situacao: "PUBLICADO", expiraEm: { lte: agora } }
          : filtro.situacao
            ? { situacao: filtro.situacao }
            : {}
    const criadoEm: Prisma.DateTimeFilter = {}
    if (filtro.dataInicial) criadoEm.gte = inicioDoDia(filtro.dataInicial)
    if (filtro.dataFinal) criadoEm.lt = new Date(inicioDoDia(filtro.dataFinal).getTime() + 86_400_000)

    const where: Prisma.AnuncioWhereInput = {
      ...situacao,
      ...(filtro.uf ? { uf: filtro.uf } : {}),
      ...(filtro.cidadeCodigo ? { cidadeCodigo: filtro.cidadeCodigo } : {}),
      ...(filtro.categoriaId ? { categoriaId: filtro.categoriaId } : {}),
      ...(filtro.dataInicial || filtro.dataFinal ? { criadoEm } : {}),
    }
    const [linhas, total] = await Promise.all([
      this.db.anuncio.findMany({
        where,
        orderBy: { criadoEm: "desc" },
        skip: (filtro.pagina - 1) * filtro.porPagina,
        take: filtro.porPagina,
        select: {
          id: true,
          codigo: true,
          titulo: true,
          uf: true,
          cidadeCodigo: true,
          situacao: true,
          publicadoEm: true,
          expiraEm: true,
          criadoEm: true,
          categoria: { select: { nome: true } },
          usuario: { select: { nome: true, email: true } },
          _count: { select: { fotos: true } },
          pagamentos: { where: { situacao: "PENDENTE" }, orderBy: { criadoEm: "desc" }, take: 1, select: { id: true, codigo: true, valor: true } },
        },
      }),
      this.db.anuncio.count({ where }),
    ])
    const itens = linhas.map(({ categoria, usuario, _count, pagamentos, ...anuncio }) => ({
      ...anuncio,
      categoriaNome: categoria.nome,
      anuncianteNome: usuario.nome,
      anuncianteEmail: usuario.email,
      totalFotos: _count.fotos,
      pagamentoPendente: pagamentos[0] ? { id: pagamentos[0].id, codigo: pagamentos[0].codigo, valorCentavos: centavos(pagamentos[0].valor) ?? 0 } : null,
    }))
    return { itens, total, pagina: filtro.pagina, porPagina: filtro.porPagina }
  }

  async categorias(): Promise<CategoriaAdminDTO[]> {
    const linhas = await this.db.categoria.findMany({
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
      select: { id: true, nome: true, slug: true, ordem: true, ativa: true, _count: { select: { anuncios: true } } },
    })
    return linhas.map(({ _count, ...categoria }) => ({ ...categoria, totalAnuncios: _count.anuncios }))
  }
}
