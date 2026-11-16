// INFRAESTRUTURA — repositórios Prisma de planos, pagamentos, configuração do Pix, banco de dias e chamados.

import type { BancoDeDiasRepository, ReferenciasDoMovimento } from "@/application/ports/banco"
import type { ConviteRegistro, ConviteRepository } from "@/application/ports/convites"
import type { MotivoDoMovimento, SaldoDoBanco, TipoDeDia } from "@/domain/banco/banco-de-dias"
import type {
  AnuncioRegistro,
  ChamadoRegistro,
  ChamadoRepository,
  Configuracao,
  ConfiguracaoRepository,
  PagamentoRegistro,
  PagamentoRepository,
  PlanoRepository,
} from "@/application/ports/caderno"
import type { OrigemDoPagamento } from "@/domain/pagamento/pagamento"
import { CODIGOS_DE_PLANO, PERIODOS, type Plano, type Precos, ehPeriodo } from "@/domain/plano/plano"
import type { Pagamento, Plano as LinhaPlano, Prisma, PrismaClient } from "@/generated/prisma"
import { centavos, codigoDoPlano, dadosDoAnuncio, decimal } from "./mapeadores"

// ── Planos ──

/** Linha do plano com os preços por período (feature 009). */
export type LinhaPlanoComPrecos = LinhaPlano & { precos: Array<{ dias: number; valor: Prisma.Decimal }> }

export const COM_PRECOS = { include: { precos: true } } as const

export function paraPlano(linha: LinhaPlanoComPrecos): Plano {
  const precos: Precos = {}
  for (const p of linha.precos) if (ehPeriodo(p.dias)) precos[p.dias] = centavos(p.valor) ?? 0
  return {
    codigo: codigoDoPlano(linha.codigo),
    nome: linha.nome,
    descricao: linha.descricao,
    maxFotos: linha.maxFotos,
    precos,
    ativo: linha.ativo,
  }
}

/** Na ordem do catálogo (Simples → Vitrine), não na ordem do banco. */
export function emOrdemDeCatalogo(planos: Plano[]): Plano[] {
  return [...planos].sort((a, b) => CODIGOS_DE_PLANO.indexOf(a.codigo) - CODIGOS_DE_PLANO.indexOf(b.codigo))
}

export class PrismaPlanoRepository implements PlanoRepository {
  constructor(private readonly db: PrismaClient) {}

  async listar() {
    return emOrdemDeCatalogo((await this.db.plano.findMany(COM_PRECOS)).map(paraPlano))
  }

  async buscar(codigo: string) {
    const linha = await this.db.plano.findUnique({ where: { codigo }, ...COM_PRECOS })
    return linha ? paraPlano(linha) : null
  }

  /** Grava o plano e troca a grade de preços inteira na mesma transação. */
  async salvar(plano: Plano) {
    const dados = { nome: plano.nome, descricao: plano.descricao, maxFotos: plano.maxFotos, ativo: plano.ativo }
    const precos = PERIODOS.flatMap((dias) => {
      const valor = plano.precos[dias]
      return valor && valor > 0 ? [{ planoCodigo: plano.codigo, dias, valor: decimal(valor) ?? "0.00" }] : []
    })
    await this.db.$transaction([
      this.db.plano.upsert({ where: { codigo: plano.codigo }, update: dados, create: { codigo: plano.codigo, ...dados } }),
      this.db.preco.deleteMany({ where: { planoCodigo: plano.codigo } }),
      this.db.preco.createMany({ data: precos }),
    ])
  }
}

// ── Pagamentos ──

function origem(valor: string | null): OrigemDoPagamento {
  return valor === "MERCADO_PAGO" || valor === "CORTESIA" || valor === "BANCO" ? valor : null
}

export function paraPagamento(linha: Pagamento): PagamentoRegistro {
  return {
    id: linha.id,
    codigo: linha.codigo,
    anuncioId: linha.anuncioId,
    usuarioId: linha.usuarioId,
    planoCodigo: codigoDoPlano(linha.planoCodigo),
    valorCentavos: centavos(linha.valor) ?? 0,
    dias: linha.dias,
    situacao: linha.situacao,
    gateway: origem(linha.gateway),
    gatewayId: linha.gatewayId,
    copiaECola: linha.copiaECola,
    vencimentoEm: linha.vencimentoEm,
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

  async buscarPorCodigo(codigo: string) {
    const linha = await this.db.pagamento.findUnique({ where: { codigo } })
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

  async cancelar(pagamentoId: string) {
    await this.db.pagamento.updateMany({ where: { id: pagamentoId, situacao: "PENDENTE" }, data: { situacao: "CANCELADO" } })
  }

  async cancelarPendentesDoAnuncio(anuncioId: string) {
    await this.db.pagamento.updateMany({ where: { anuncioId, situacao: "PENDENTE" }, data: { situacao: "CANCELADO" } })
  }

  async confirmarEPublicar(pagamento: PagamentoRegistro, anuncio: AnuncioRegistro) {
    const { id: anuncioId, ...resto } = anuncio
    return this.db.$transaction(async (tx) => {
      // "Ainda pendente" na condição: webhook repetido ou dois cliques não confirmam duas vezes (RN-81).
      const { count } = await tx.pagamento.updateMany({
        where: { id: pagamento.id, situacao: "PENDENTE" },
        data: { situacao: "CONFIRMADO", confirmadoEm: pagamento.confirmadoEm, confirmadoPorId: pagamento.confirmadoPorId },
      })
      if (count === 0) return false
      await tx.anuncio.update({ where: { id: anuncioId }, data: dadosDoAnuncio(resto) })
      return true
    })
  }
}

// ── Configuração do Pix estático ──

export class PrismaConfiguracaoRepository implements ConfiguracaoRepository {
  constructor(private readonly db: PrismaClient) {}

  async obter(): Promise<Configuracao> {
    const linha = await this.db.configuracao.findUnique({ where: { id: "geral" } })
    return { pixChave: linha?.pixChave ?? "", pixNome: linha?.pixNome ?? "", pixCidade: linha?.pixCidade ?? "" }
  }

  async salvar(cfg: Configuracao) {
    await this.db.configuracao.upsert({ where: { id: "geral" }, update: cfg, create: { id: "geral", ...cfg } })
  }

  /** Feature 017 (RF-174). Sem a linha de configuração, vale o padrão: ligado. */
  async presenteLigado() {
    const linha = await this.db.configuracao.findUnique({ where: { id: "geral" }, select: { presenteLigado: true } })
    return linha?.presenteLigado ?? true
  }

  async ligarPresente(ligado: boolean) {
    await this.db.configuracao.upsert({ where: { id: "geral" }, update: { presenteLigado: ligado }, create: { id: "geral", presenteLigado: ligado } })
  }

  /** Feature 015 (RF-256). Sem a linha de configuração, vale o padrão: ligado. */
  async convitesLigados() {
    const linha = await this.db.configuracao.findUnique({ where: { id: "geral" }, select: { convitesLigados: true } })
    return linha?.convitesLigados ?? true
  }

  async ligarConvites(ligado: boolean) {
    await this.db.configuracao.upsert({ where: { id: "geral" }, update: { convitesLigados: ligado }, create: { id: "geral", convitesLigados: ligado } })
  }
}

// ── Convites (feature 015, ADR-22) ──

export class PrismaConviteRepository implements ConviteRepository {
  constructor(private readonly db: PrismaClient) {}

  async inserir(convite: Omit<ConviteRegistro, "id">) {
    const { id } = await this.db.convite.create({ data: convite, select: { id: true } })
    return id
  }

  async doConvidante(convidanteId: string) {
    return this.db.convite.findMany({ where: { convidanteId }, orderBy: { criadoEm: "desc" } })
  }

  async porCodigoHash(codigoHash: string) {
    return this.db.convite.findUnique({ where: { codigoHash } })
  }

  /** Condicionada: dois cadastros com o mesmo link não aceitam o mesmo convite. */
  async aceitar(id: string, usuarioId: string, quando: Date) {
    try {
      const { count } = await this.db.convite.updateMany({ where: { id, aceitoPorId: null, canceladoEm: null }, data: { aceitoPorId: usuarioId, aceitoEm: quando } })
      return count === 1
    } catch {
      // aceitoPorId é único: a conta que já aceitou outro convite não aceita este.
      return false
    }
  }

  async aceitoPor(usuarioId: string) {
    return this.db.convite.findUnique({ where: { aceitoPorId: usuarioId } })
  }

  async premiar(id: string, quando: Date) {
    const { count } = await this.db.convite.updateMany({ where: { id, premiadoEm: null }, data: { premiadoEm: quando } })
    return count === 1
  }

  async cancelar(id: string, convidanteId: string, quando: Date) {
    const { count } = await this.db.convite.updateMany({ where: { id, convidanteId, aceitoPorId: null, canceladoEm: null }, data: { canceladoEm: quando } })
    return count === 1
  }
}

// ── Banco de dias (feature 017, ADR-21) ──

const COLUNA_DO_TIPO = { SIMPLES: "bancoDiasSimples", FOTOS: "bancoDiasFotos" } as const

export class PrismaBancoDeDiasRepository implements BancoDeDiasRepository {
  constructor(private readonly db: PrismaClient) {}

  async saldo(usuarioId: string): Promise<SaldoDoBanco> {
    const linha = await this.db.usuario.findUnique({ where: { id: usuarioId }, select: { bancoDiasSimples: true, bancoDiasFotos: true } })
    return { SIMPLES: linha?.bancoDiasSimples ?? 0, FOTOS: linha?.bancoDiasFotos ?? 0 }
  }

  async creditar(usuarioId: string, tipo: TipoDeDia, dias: number, motivo: MotivoDoMovimento, referencias: ReferenciasDoMovimento = {}) {
    await this.db.$transaction([
      this.db.usuario.update({ where: { id: usuarioId }, data: { [COLUNA_DO_TIPO[tipo]]: { increment: dias } } }),
      this.db.movimentoDoBanco.create({ data: { usuarioId, planoCodigo: tipo, dias, motivo, anuncioId: referencias.anuncioId ?? null, pagamentoId: referencias.pagamentoId ?? null } }),
    ])
  }

  /** RN-173: o UPDATE só acontece com saldo suficiente; o extrato entra na mesma transação. */
  async debitar(usuarioId: string, tipo: TipoDeDia, dias: number, referencias: ReferenciasDoMovimento = {}) {
    const coluna = COLUNA_DO_TIPO[tipo]
    return this.db.$transaction(async (tx) => {
      const { count } = await tx.usuario.updateMany({ where: { id: usuarioId, [coluna]: { gte: dias } }, data: { [coluna]: { decrement: dias } } })
      if (count !== 1) return false
      await tx.movimentoDoBanco.create({
        data: { usuarioId, planoCodigo: tipo, dias: -dias, motivo: "USO", anuncioId: referencias.anuncioId ?? null, pagamentoId: referencias.pagamentoId ?? null },
      })
      return true
    })
  }

  /** RN-174: só quem ainda não recebeu (presenteEm nulo); duas confirmações ao mesmo tempo não dão dois presentes. */
  async darPresente(usuarioId: string, presente: SaldoDoBanco, quando: Date) {
    return this.db.$transaction(async (tx) => {
      const { count } = await tx.usuario.updateMany({
        where: { id: usuarioId, presenteEm: null },
        data: { presenteEm: quando, bancoDiasSimples: { increment: presente.SIMPLES }, bancoDiasFotos: { increment: presente.FOTOS } },
      })
      if (count !== 1) return false
      await tx.movimentoDoBanco.createMany({
        data: (["SIMPLES", "FOTOS"] as const)
          .filter((tipo) => presente[tipo] > 0)
          .map((tipo) => ({ usuarioId, planoCodigo: tipo, dias: presente[tipo], motivo: "BOAS_VINDAS" as const, criadoEm: quando })),
      })
      return true
    })
  }
}

// ── Chamados ──

export class PrismaChamadoRepository implements ChamadoRepository {
  constructor(private readonly db: PrismaClient) {}

  async inserir(chamado: Omit<ChamadoRegistro, "id">) {
    const { id } = await this.db.chamado.create({ data: chamado, select: { id: true } })
    return id
  }

  async existeProtocolo(protocolo: string) {
    return (await this.db.chamado.count({ where: { protocolo } })) > 0
  }

  async contarDoEmailDesde(email: string, desde: Date) {
    return this.db.chamado.count({ where: { email, criadoEm: { gte: desde } } })
  }

  async buscarPorId(id: string) {
    return this.db.chamado.findUnique({ where: { id } })
  }

  async atualizar(chamado: ChamadoRegistro) {
    const { id, ...dados } = chamado
    await this.db.chamado.update({ where: { id }, data: dados })
  }
}
