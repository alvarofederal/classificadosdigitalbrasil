// INFRAESTRUTURA — repositórios Prisma (MySQL). Implementam as portas da aplicação.

import type {
  NovoUsuario,
  SessaoRepository,
  SessaoValida,
  TentativaLoginRepository,
  UsuarioRegistro,
  UsuarioRepository,
} from "@/application/ports/acesso"
import type {
  AnuncioRegistro,
  AnuncioRepository,
  CategoriaRepository,
  Configuracao,
  ConfiguracaoRepository,
  FotoRegistro,
  FotoRepository,
  MensagemRepository,
  NovaFoto,
  PagamentoRegistro,
  PagamentoRepository,
} from "@/application/ports/caderno"
import type { Categoria } from "@/domain/categoria/categoria"
import type { NovaMensagem } from "@/domain/mensagem/mensagem"
import { DIAS_PADRAO, VALOR_PADRAO_CENTAVOS } from "@/domain/pagamento/pagamento"
import type { Pagamento, PrismaClient, Usuario } from "@/generated/prisma"
import { centavos, dadosDoAnuncio, decimal, paraAnuncio } from "./mapeadores"

// ── Acesso ──

function paraUsuario(linha: Usuario): UsuarioRegistro {
  return {
    id: linha.id,
    nome: linha.nome,
    cpf: linha.cpf,
    email: linha.email,
    celular: linha.celular,
    uf: linha.uf,
    cidadeCodigo: linha.cidadeCodigo,
    senhaHash: linha.senhaHash,
    perfil: linha.perfil,
    ativo: linha.ativo,
    deveTrocarSenha: linha.deveTrocarSenha,
    aceitouTermosEm: linha.aceitouTermosEm,
  }
}

export class PrismaUsuarioRepository implements UsuarioRepository {
  constructor(private readonly db: PrismaClient) {}

  async buscarPorId(id: string) {
    const linha = await this.db.usuario.findUnique({ where: { id } })
    return linha ? paraUsuario(linha) : null
  }

  async buscarPorEmail(email: string) {
    const linha = await this.db.usuario.findUnique({ where: { email } })
    return linha ? paraUsuario(linha) : null
  }

  async existeEmail(email: string, excetoUsuarioId?: string) {
    return (await this.db.usuario.count({ where: { email, ...(excetoUsuarioId ? { id: { not: excetoUsuarioId } } : {}) } })) > 0
  }

  async existeCpf(cpf: string) {
    return (await this.db.usuario.count({ where: { cpf } })) > 0
  }

  async inserir(usuario: NovoUsuario) {
    const { id } = await this.db.usuario.create({ data: usuario, select: { id: true } })
    return id
  }

  async atualizar(usuario: UsuarioRegistro) {
    const { id, ...dados } = usuario
    await this.db.usuario.update({ where: { id }, data: dados })
  }

  async registrarAcesso(usuarioId: string, quando: Date) {
    await this.db.usuario.update({ where: { id: usuarioId }, data: { ultimoAcesso: quando } })
  }
}

export class PrismaSessaoRepository implements SessaoRepository {
  constructor(private readonly db: PrismaClient) {}

  async criar(params: { usuarioId: string; tokenHash: string; expiraEm: Date }) {
    await this.db.sessao.create({ data: params })
  }

  async buscarValida(tokenHash: string, agora: Date): Promise<SessaoValida | null> {
    const sessao = await this.db.sessao.findUnique({
      where: { tokenHash },
      include: { usuario: { select: { id: true, nome: true, email: true, perfil: true, ativo: true, deveTrocarSenha: true } } },
    })
    if (!sessao || sessao.expiraEm <= agora) return null
    return { sessaoId: sessao.id, expiraEm: sessao.expiraEm, usuario: sessao.usuario }
  }

  async renovar(sessaoId: string, expiraEm: Date) {
    await this.db.sessao.update({ where: { id: sessaoId }, data: { expiraEm } })
  }

  async remover(tokenHash: string) {
    await this.db.sessao.deleteMany({ where: { tokenHash } })
  }

  async removerTodasDoUsuario(usuarioId: string, excetoTokenHash?: string) {
    await this.db.sessao.deleteMany({ where: { usuarioId, ...(excetoTokenHash ? { tokenHash: { not: excetoTokenHash } } : {}) } })
  }
}

export class PrismaTentativaLoginRepository implements TentativaLoginRepository {
  constructor(private readonly db: PrismaClient) {}

  async registrar(params: { email: string; ip: string; sucesso: boolean }) {
    await this.db.tentativaLogin.create({ data: { ...params, email: params.email.slice(0, 160), ip: params.ip.slice(0, 64) } })
  }

  async contarFalhasDesde(ip: string, desde: Date) {
    return this.db.tentativaLogin.count({ where: { ip, sucesso: false, criadoEm: { gte: desde } } })
  }
}

// ── Caderno ──

export class PrismaCategoriaRepository implements CategoriaRepository {
  constructor(private readonly db: PrismaClient) {}

  async listar(): Promise<Categoria[]> {
    return this.db.categoria.findMany({ orderBy: [{ ordem: "asc" }, { nome: "asc" }], select: { id: true, nome: true, slug: true, ordem: true, ativa: true } })
  }

  async buscarPorId(id: string) {
    return this.db.categoria.findUnique({ where: { id }, select: { id: true, nome: true, slug: true, ordem: true, ativa: true } })
  }

  async existeSlug(slug: string, excetoId?: string) {
    return (await this.db.categoria.count({ where: { slug, ...(excetoId ? { id: { not: excetoId } } : {}) } })) > 0
  }

  async inserir(categoria: Omit<Categoria, "id">) {
    const { id } = await this.db.categoria.create({ data: categoria, select: { id: true } })
    return id
  }

  async atualizar(categoria: Categoria) {
    const { id, ...dados } = categoria
    await this.db.categoria.update({ where: { id }, data: dados })
  }

  async remover(id: string) {
    await this.db.categoria.delete({ where: { id } })
  }

  async contarAnuncios(id: string) {
    return this.db.anuncio.count({ where: { categoriaId: id } })
  }
}

export class PrismaAnuncioRepository implements AnuncioRepository {
  constructor(private readonly db: PrismaClient) {}

  async buscarPorId(id: string) {
    const linha = await this.db.anuncio.findUnique({ where: { id } })
    return linha ? paraAnuncio(linha) : null
  }

  async existeCodigo(codigo: string) {
    return (await this.db.anuncio.count({ where: { codigo } })) > 0
  }

  async inserir(anuncio: Omit<AnuncioRegistro, "id">) {
    const { id } = await this.db.anuncio.create({ data: dadosDoAnuncio(anuncio), select: { id: true } })
    return id
  }

  async atualizar(anuncio: AnuncioRegistro) {
    const { id, ...resto } = anuncio
    await this.db.anuncio.update({ where: { id }, data: dadosDoAnuncio(resto) })
  }
}

export class PrismaFotoRepository implements FotoRepository {
  constructor(private readonly db: PrismaClient) {}

  async listar(anuncioId: string): Promise<FotoRegistro[]> {
    return this.db.fotoAnuncio.findMany({
      where: { anuncioId },
      orderBy: [{ ordem: "asc" }, { criadoEm: "asc" }],
      select: { id: true, anuncioId: true, url: true, publicId: true, ordem: true },
    })
  }

  async adicionar(anuncioId: string, fotos: NovaFoto[]) {
    const ultima = await this.db.fotoAnuncio.findFirst({ where: { anuncioId }, orderBy: { ordem: "desc" }, select: { ordem: true } })
    const inicio = (ultima?.ordem ?? -1) + 1
    await this.db.fotoAnuncio.createMany({ data: fotos.map((foto, i) => ({ anuncioId, url: foto.url, publicId: foto.publicId, ordem: inicio + i })) })
  }

  async reordenar(anuncioId: string, idsNaOrdem: string[]) {
    await this.db.$transaction(idsNaOrdem.map((id, ordem) => this.db.fotoAnuncio.updateMany({ where: { id, anuncioId }, data: { ordem } })))
  }

  async remover(fotoId: string) {
    await this.db.fotoAnuncio.delete({ where: { id: fotoId } })
  }
}

export class PrismaMensagemRepository implements MensagemRepository {
  constructor(private readonly db: PrismaClient) {}

  async inserir(anuncioId: string, mensagem: NovaMensagem) {
    await this.db.mensagem.create({ data: { anuncioId, ...mensagem } })
  }

  async contarDoContatoDesde(anuncioId: string, contato: string, desde: Date) {
    return this.db.mensagem.count({ where: { anuncioId, contato, criadoEm: { gte: desde } } })
  }

  async marcarComoLidas(anuncioId: string) {
    await this.db.mensagem.updateMany({ where: { anuncioId, lida: false }, data: { lida: true } })
  }
}

function paraPagamento(linha: Pagamento): PagamentoRegistro {
  return {
    id: linha.id,
    codigo: linha.codigo,
    anuncioId: linha.anuncioId,
    usuarioId: linha.usuarioId,
    valorCentavos: centavos(linha.valor) ?? 0,
    dias: linha.dias,
    situacao: linha.situacao,
    criadoEm: linha.criadoEm,
    confirmadoEm: linha.confirmadoEm,
    confirmadoPorId: linha.confirmadoPorId,
  }
}

export class PrismaPagamentoRepository implements PagamentoRepository {
  constructor(private readonly db: PrismaClient) {}

  async buscarPorId(id: string) {
    const linha = await this.db.pagamento.findUnique({ where: { id } })
    return linha ? paraPagamento(linha) : null
  }

  async pendenteDoAnuncio(anuncioId: string) {
    const linha = await this.db.pagamento.findFirst({ where: { anuncioId, situacao: "PENDENTE" }, orderBy: { criadoEm: "desc" } })
    return linha ? paraPagamento(linha) : null
  }

  async existeCodigo(codigo: string) {
    return (await this.db.pagamento.count({ where: { codigo } })) > 0
  }

  async inserir(pagamento: Omit<PagamentoRegistro, "id">) {
    const { valorCentavos, ...resto } = pagamento
    const { id } = await this.db.pagamento.create({ data: { ...resto, valor: decimal(valorCentavos) ?? "0.00" }, select: { id: true } })
    return id
  }

  async cancelarPendentesDoAnuncio(anuncioId: string) {
    await this.db.pagamento.updateMany({ where: { anuncioId, situacao: "PENDENTE" }, data: { situacao: "CANCELADO" } })
  }

  async confirmarEPublicar(pagamento: PagamentoRegistro, anuncio: AnuncioRegistro) {
    const { id: anuncioId, ...resto } = anuncio
    await this.db.$transaction(async (tx) => {
      // A condição "ainda pendente" impede confirmar duas vezes em cliques simultâneos.
      const { count } = await tx.pagamento.updateMany({
        where: { id: pagamento.id, situacao: "PENDENTE" },
        data: { situacao: "CONFIRMADO", confirmadoEm: pagamento.confirmadoEm, confirmadoPorId: pagamento.confirmadoPorId },
      })
      if (count === 0) throw new Error("Pagamento já processado.")
      await tx.anuncio.update({ where: { id: anuncioId }, data: dadosDoAnuncio(resto) })
    })
  }
}

export class PrismaConfiguracaoRepository implements ConfiguracaoRepository {
  constructor(private readonly db: PrismaClient) {}

  async obter(): Promise<Configuracao> {
    const linha = await this.db.configuracao.findUnique({ where: { id: "geral" } })
    if (!linha) return { pixChave: "", pixNome: "", pixCidade: "", valorAnuncioCentavos: VALOR_PADRAO_CENTAVOS, diasDePublicacao: DIAS_PADRAO }
    return {
      pixChave: linha.pixChave,
      pixNome: linha.pixNome,
      pixCidade: linha.pixCidade,
      valorAnuncioCentavos: centavos(linha.valorAnuncio) ?? VALOR_PADRAO_CENTAVOS,
      diasDePublicacao: linha.diasDePublicacao,
    }
  }

  async salvar(cfg: Configuracao) {
    const dados = {
      pixChave: cfg.pixChave,
      pixNome: cfg.pixNome,
      pixCidade: cfg.pixCidade,
      valorAnuncio: decimal(cfg.valorAnuncioCentavos) ?? "1.00",
      diasDePublicacao: cfg.diasDePublicacao,
    }
    await this.db.configuracao.upsert({ where: { id: "geral" }, update: dados, create: { id: "geral", ...dados } })
  }
}
