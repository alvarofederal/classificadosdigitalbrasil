// INFRAESTRUTURA — repositórios Prisma de planos, pagamentos, configuração do Pix e chamados.

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
  return valor === "MERCADO_PAGO" || valor === "CORTESIA" ? valor : null
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
