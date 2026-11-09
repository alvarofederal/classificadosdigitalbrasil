// INFRAESTRUTURA — tradução entre linhas do Prisma e registros da aplicação.

import type { AnuncioRegistro } from "@/application/ports/caderno"
import { type CodigoDoPlano, ehCodigoDePlano } from "@/domain/plano/plano"
import { centavosDeDecimal, centavosParaDecimal } from "@/domain/shared/dinheiro"
import type { Anuncio, Prisma } from "@/generated/prisma"

export function centavos(valor: Prisma.Decimal | null): number | null {
  return valor === null ? null : centavosDeDecimal(valor.toFixed(2))
}

export function decimal(valor: number | null): string | null {
  return valor === null ? null : centavosParaDecimal(valor)
}

/** Código guardado como texto no banco; qualquer valor estranho vira Simples. */
export function codigoDoPlano(valor: string): CodigoDoPlano {
  return ehCodigoDePlano(valor) ? valor : "SIMPLES"
}

export function paraAnuncio(linha: Anuncio): AnuncioRegistro {
  return {
    id: linha.id,
    codigo: linha.codigo,
    usuarioId: linha.usuarioId,
    categoriaId: linha.categoriaId,
    uf: linha.uf,
    cidadeCodigo: linha.cidadeCodigo,
    titulo: linha.titulo,
    texto: linha.texto,
    precoCentavos: centavos(linha.preco),
    estilo: { moldura: linha.moldura, estiloTitulo: linha.estiloTitulo, alinhamento: linha.alinhamento, estrelas: linha.estrelas },
    situacao: linha.situacao,
    planoCodigo: codigoDoPlano(linha.planoCodigo),
    prioridade: linha.prioridade,
    publicadoEm: linha.publicadoEm,
    expiraEm: linha.expiraEm,
  }
}

export function dadosDoAnuncio(anuncio: Omit<AnuncioRegistro, "id">) {
  return {
    codigo: anuncio.codigo,
    usuarioId: anuncio.usuarioId,
    categoriaId: anuncio.categoriaId,
    uf: anuncio.uf,
    cidadeCodigo: anuncio.cidadeCodigo,
    titulo: anuncio.titulo,
    texto: anuncio.texto,
    preco: decimal(anuncio.precoCentavos),
    moldura: anuncio.estilo.moldura,
    estiloTitulo: anuncio.estilo.estiloTitulo,
    alinhamento: anuncio.estilo.alinhamento,
    estrelas: anuncio.estilo.estrelas,
    situacao: anuncio.situacao,
    planoCodigo: anuncio.planoCodigo,
    prioridade: anuncio.prioridade,
    publicadoEm: anuncio.publicadoEm,
    expiraEm: anuncio.expiraEm,
  }
}

/** Filtro do que está no ar (RN-13): publicado e com data de expiração no futuro. */
export function noAr(agora: Date) {
  return { situacao: "PUBLICADO" as const, expiraEm: { gt: agora } }
}

/** RN-50: maior plano primeiro; no mesmo plano, quem pagou por último (expira por último). */
export const ORDEM_DO_CADERNO = [{ prioridade: "desc" as const }, { expiraEm: "desc" as const }, { id: "asc" as const }]
