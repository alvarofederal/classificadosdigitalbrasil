// DOMÍNIO — o anúncio: conteúdo, formatação de jornal e tempo no ar (RF-10 a RF-16, RN-10 a RN-16).

import type { ErrosDeCampo } from "../shared/result"
import { validarTamanho } from "../shared/texto"
import { ehUF } from "../localidade/uf"

export const LIMITES_DO_ANUNCIO = {
  tituloMin: 3,
  tituloMax: 40,
  textoMin: 10,
  textoMax: 280,
  /** R$ 99.999.999,99 */
  precoMaxCentavos: 9_999_999_999,
} as const

export const MAXIMO_FOTOS = 6

// ── Formatação dinâmica: o anunciante monta o quadrado como no jornal. Tudo na mesma cor. ──

export const MOLDURAS = {
  NENHUMA: "Sem moldura",
  SIMPLES: "Fio simples",
  DUPLA: "Fio duplo",
  TRACEJADA: "Tracejada",
} as const

export const ESTILOS_DE_TITULO = {
  NEGRITO: "Negrito",
  TARJA: "Tarja preta",
  SUBLINHADO: "Sublinhado",
} as const

export const ALINHAMENTOS = {
  ESQUERDA: "À esquerda",
  CENTRO: "Centralizado",
} as const

export type Moldura = keyof typeof MOLDURAS
export type EstiloDeTitulo = keyof typeof ESTILOS_DE_TITULO
export type Alinhamento = keyof typeof ALINHAMENTOS

export interface EstiloDoAnuncio {
  moldura: Moldura
  estiloTitulo: EstiloDeTitulo
  alinhamento: Alinhamento
  /** Fileira de ★ ★ ★ acima e abaixo, como nos classificados impressos. */
  estrelas: boolean
}

export const ESTILO_PADRAO: EstiloDoAnuncio = {
  moldura: "SIMPLES",
  estiloTitulo: "NEGRITO",
  alinhamento: "ESQUERDA",
  estrelas: false,
}

export interface ConteudoDoAnuncio {
  categoriaId: string
  uf: string
  cidadeCodigo: number
  titulo: string
  texto: string
  precoCentavos: number | null
  estilo: EstiloDoAnuncio
}

/** Espaços repetidos saem; o texto guarda no máximo uma linha em branco seguida. */
export function normalizarConteudo(conteudo: ConteudoDoAnuncio): ConteudoDoAnuncio {
  return {
    ...conteudo,
    uf: conteudo.uf.trim().toUpperCase(),
    titulo: conteudo.titulo.trim().replace(/\s+/g, " "),
    texto: conteudo.texto
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .map((linha) => linha.trim().replace(/[ \t]+/g, " "))
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  }
}

export function validarConteudo(conteudo: ConteudoDoAnuncio): ErrosDeCampo {
  const erros: ErrosDeCampo = {}
  if (!conteudo.categoriaId) erros.categoriaId = "Escolha a categoria."
  if (!ehUF(conteudo.uf)) erros.uf = "Escolha o estado."
  if (!Number.isInteger(conteudo.cidadeCodigo) || conteudo.cidadeCodigo <= 0) erros.cidadeCodigo = "Escolha a cidade."
  validarTamanho(conteudo.titulo, "titulo", "o título", { min: LIMITES_DO_ANUNCIO.tituloMin, max: LIMITES_DO_ANUNCIO.tituloMax }, erros)
  validarTamanho(conteudo.texto, "texto", "o texto", { min: LIMITES_DO_ANUNCIO.textoMin, max: LIMITES_DO_ANUNCIO.textoMax }, erros)
  if (conteudo.precoCentavos !== null) {
    if (!Number.isSafeInteger(conteudo.precoCentavos) || conteudo.precoCentavos <= 0) erros.preco = "Preço inválido."
    else if (conteudo.precoCentavos > LIMITES_DO_ANUNCIO.precoMaxCentavos) erros.preco = "Preço acima do permitido."
  }
  const { moldura, estiloTitulo, alinhamento } = conteudo.estilo
  if (!(moldura in MOLDURAS)) erros.moldura = "Moldura inválida."
  if (!(estiloTitulo in ESTILOS_DE_TITULO)) erros.estiloTitulo = "Estilo de título inválido."
  if (!(alinhamento in ALINHAMENTOS)) erros.alinhamento = "Alinhamento inválido."
  return erros
}

// ── Ciclo de vida ──

export const SITUACOES = {
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  PUBLICADO: "Publicado",
  REMOVIDO: "Removido",
} as const

export type Situacao = keyof typeof SITUACOES

/** O que a tela mostra: "publicado" se divide em no ar e expirado pela data (RN-13). */
export const SITUACOES_EXIBIDAS = {
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  NO_AR: "No ar",
  EXPIRADO: "Expirado",
  REMOVIDO: "Removido",
} as const

export type SituacaoExibida = keyof typeof SITUACOES_EXIBIDAS

export function situacaoExibida(situacao: Situacao, expiraEm: Date | null, agora: Date): SituacaoExibida {
  if (situacao === "REMOVIDO") return "REMOVIDO"
  if (situacao === "AGUARDANDO_PAGAMENTO") return "AGUARDANDO_PAGAMENTO"
  return expiraEm && expiraEm.getTime() > agora.getTime() ? "NO_AR" : "EXPIRADO"
}

export function estaNoAr(situacao: Situacao, expiraEm: Date | null, agora: Date): boolean {
  return situacaoExibida(situacao, expiraEm, agora) === "NO_AR"
}

/**
 * RN-90: o que dizer ao dono na tela do anúncio que ele acabou de criar.
 * Enquanto há Pix em aberto, pede o pagamento; depois de pago, confirma. Nunca pede Pix de anúncio que já está no ar.
 */
export type AvisoDoRecemCriado = "PAGAR" | "NO_AR" | null

export function avisoDoRecemCriado(recemCriado: boolean, situacao: SituacaoExibida, temCobrancaAberta: boolean): AvisoDoRecemCriado {
  if (!recemCriado) return null
  if (situacao === "NO_AR") return "NO_AR"
  return situacao === "AGUARDANDO_PAGAMENTO" && temCobrancaAberta ? "PAGAR" : null
}

/**
 * RN-12: pagar de novo soma dias. Se ainda está no ar, os dias entram depois do fim atual;
 * se já expirou (ou nunca foi ao ar), contam a partir de agora.
 */
export function novaExpiracao(expiraAtual: Date | null, agora: Date, dias: number): Date {
  const base = expiraAtual && expiraAtual.getTime() > agora.getTime() ? expiraAtual : agora
  return new Date(base.getTime() + dias * 86_400_000)
}

// ── Código público (endereço /anuncio/<código>) ──

export const ALFABETO_DO_CODIGO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
export const TAMANHO_DO_CODIGO = 6

export function codigoValido(codigo: string): boolean {
  return new RegExp(`^[${ALFABETO_DO_CODIGO}]{${TAMANHO_DO_CODIGO}}$`).test(codigo)
}
