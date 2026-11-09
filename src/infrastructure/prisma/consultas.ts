// INFRAESTRUTURA — consultas de leitura com Prisma (implementam src/application/queries/consultas.ts).

import type {
  AnuncioAdminDTO,
  AnuncioDoPainelDTO,
  AnuncioPublicoDTO,
  CategoriaAdminDTO,
  ChamadoDTO,
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
import type { Assunto, SituacaoDoChamado } from "@/domain/chamado/chamado"
import type { Plano } from "@/domain/plano/plano"
import type { Pagamento, Prisma, PrismaClient } from "@/generated/prisma"
import { ORDEM_DO_CADERNO, centavos, codigoDoPlano, noAr } from "./mapeadores"
import { emOrdemDeCatalogo, paraPagamento, paraPlano } from "./repositorios-pagamento"

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
  planoCodigo: true,
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
    planoCodigo: codigoDoPlano(linha.planoCodigo),
    fotos: linha.fotos,
    uf: linha.uf,
    cidadeCodigo: linha.cidadeCodigo,
    categoriaNome: linha.categoria.nome,
    categoriaSlug: linha.categoria.slug,
    expiraEm: linha.expiraEm,
  }
}

function paraPagamentoResumo(linha: Pagamento): PagamentoResumoDTO {
  const p = paraPagamento(linha)
  return {
    id: p.id,
    codigo: p.codigo,
    planoCodigo: p.planoCodigo,
    valorCentavos: p.valorCentavos,
    dias: p.dias,
    situacao: p.situacao,
    gateway: p.gateway,
    copiaECola: p.copiaECola,
    vencimentoEm: p.vencimentoEm,
    criadoEm: p.criadoEm,
    confirmadoEm: p.confirmadoEm,
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
        orderBy: ORDEM_DO_CADERNO,
        skip: (params.pagina - 1) * params.porPagina,
        take: params.porPagina,
        select: SELECAO_PUBLICA,
      }),
      this.db.anuncio.count({ where }),
    ])
    return { itens: linhas.map(paraPublico), total, pagina: params.pagina, porPagina: params.porPagina }
  }

  async primeirosPorSecao(params: { cidadeCodigo: number; categoriaIds: string[]; limite: number; agora: Date }) {
    const listas = await Promise.all(
      params.categoriaIds.map((categoriaId) =>
        this.db.anuncio.findMany({
          where: { cidadeCodigo: params.cidadeCodigo, categoriaId, ...noAr(params.agora) },
          orderBy: ORDEM_DO_CADERNO,
          take: params.limite,
          select: SELECAO_PUBLICA,
        }),
      ),
    )
    return Object.fromEntries(params.categoriaIds.map((id, i) => [id, listas[i].map(paraPublico)]))
  }

  async anuncioNoAr(codigo: string, agora: Date) {
    const linha = await this.db.anuncio.findFirst({ where: { codigo, ...noAr(agora) }, select: SELECAO_PUBLICA })
    return linha ? paraPublico(linha) : null
  }

  async planosAVenda(): Promise<Plano[]> {
    return emOrdemDeCatalogo((await this.db.plano.findMany({ where: { ativo: true } })).map(paraPlano))
  }

  async vitrine(agora: Date, limite: number) {
    const linhas = await this.db.anuncio.findMany({
      where: { planoCodigo: "VITRINE", ...noAr(agora) },
      orderBy: [{ expiraEm: "desc" }, { id: "asc" }],
      take: limite,
      select: SELECAO_PUBLICA,
    })
    return linhas.map(paraPublico)
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
  planoCodigo: true,
  visualizacoes: true,
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
    planoCodigo: codigoDoPlano(linha.planoCodigo),
    visualizacoes: linha.visualizacoes,
    publicadoEm: linha.publicadoEm,
    expiraEm: linha.expiraEm,
    criadoEm: linha.criadoEm,
    fotos: linha.fotos,
    mensagensNaoLidas: linha.mensagens.filter((m) => !m.lida).length,
    totalMensagens: linha.mensagens.length,
    pagamentoPendente: linha.pagamentos[0] ? paraPagamentoResumo(linha.pagamentos[0]) : null,
  }
}

/** Detalhe usado pelo dono (Minha conta) e pelo admin (Painel): mensagens e histórico de pagamentos. */
async function detalheDoAnuncio(db: PrismaClient, where: Prisma.AnuncioWhereInput): Promise<MeuAnuncioDetalheDTO | null> {
  const linha = await db.anuncio.findFirst({
    where,
    select: {
      ...SELECAO_MEU_ANUNCIO,
      mensagens: { orderBy: { criadoEm: "desc" }, select: { id: true, nome: true, contato: true, texto: true, lida: true, criadoEm: true } },
    },
  })
  if (!linha) return null
  const historico = await db.pagamento.findMany({ where: { anuncioId: linha.id }, orderBy: { criadoEm: "desc" } })
  return { ...paraMeuAnuncio(linha), mensagens: linha.mensagens, pagamentos: historico.map(paraPagamentoResumo) }
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
    return detalheDoAnuncio(this.db, { id: anuncioId, usuarioId, situacao: { not: "REMOVIDO" } })
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
    const [usuarios, anunciosNoAr, aguardandoPagamento, confirmados, chamadosAbertos] = await Promise.all([
      this.db.usuario.count({ where: { perfil: "ANUNCIANTE" } }),
      this.db.anuncio.count({ where: noAr(agora) }),
      this.db.anuncio.count({ where: { situacao: "AGUARDANDO_PAGAMENTO" } }),
      this.db.pagamento.aggregate({ where: { situacao: "CONFIRMADO" }, _count: { _all: true }, _sum: { valor: true } }),
      this.db.chamado.count({ where: { situacao: "ABERTO" } }),
    ])
    return {
      usuarios,
      anunciosNoAr,
      aguardandoPagamento,
      pagamentosConfirmados: confirmados._count._all,
      valorRecebidoCentavos: centavos(confirmados._sum.valor) ?? 0,
      chamadosAbertos,
    }
  }

  async anuncio(id: string): Promise<AnuncioDoPainelDTO | null> {
    const detalhe = await detalheDoAnuncio(this.db, { id })
    if (!detalhe) return null
    const dono = await this.db.anuncio.findUnique({ where: { id }, select: { usuario: { select: { id: true, nome: true, email: true, celular: true } } } })
    return dono ? { ...detalhe, anunciante: dono.usuario } : null
  }

  async planos(): Promise<Plano[]> {
    return emOrdemDeCatalogo((await this.db.plano.findMany()).map(paraPlano))
  }

  async chamados(params: { pagina: number; porPagina: number; situacao: SituacaoDoChamado | null; assunto: Assunto | null }): Promise<Pagina<ChamadoDTO>> {
    const where = { ...(params.situacao ? { situacao: params.situacao } : {}), ...(params.assunto ? { assunto: params.assunto } : {}) }
    const [itens, total] = await Promise.all([
      this.db.chamado.findMany({ where, orderBy: { criadoEm: "desc" }, skip: (params.pagina - 1) * params.porPagina, take: params.porPagina }),
      this.db.chamado.count({ where }),
    ])
    return { itens, total, pagina: params.pagina, porPagina: params.porPagina }
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
          planoCodigo: true,
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
      planoCodigo: codigoDoPlano(anuncio.planoCodigo),
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
