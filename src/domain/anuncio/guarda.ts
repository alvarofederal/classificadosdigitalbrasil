// DOMÍNIO — guarda dos vencidos: o anúncio vencido fica 180 dias, as mensagens 90, e o dono é avisado 7 dias antes de apagar
// (feature 018: RF-180 a RF-183, RN-182 a RN-189; ADR-24).

import { type Carta, NOME_DO_JORNAL, primeiroNome } from "../shared/carta"
import type { Situacao } from "./anuncio"

const DIA_MS = 86_400_000

/** RN-182: dias que o vencido fica guardado, contados do fim do prazo. */
export const DIAS_GUARDADO = 180
/** RN-183: dias que as mensagens do vencido ficam para leitura, contados do fim do prazo. */
export const DIAS_DAS_MENSAGENS = 90
/** RN-184: dias que o anúncio nunca publicado fica guardado, contados da criação. */
export const DIAS_DO_NUNCA_PUBLICADO = 180
/** RF-183: o e-mail sai quando faltam estes dias para apagar. */
export const DIAS_DO_AVISO_ANTES_DE_APAGAR = 7

/** RN-189: anúncios apagados e e-mails por rodada; o que sobrar fica para a rodada seguinte. */
export const APAGADOS_POR_RODADA = 100
export const AVISOS_DE_APAGAR_POR_RODADA = 200

function somarDias(instante: Date, dias: number): Date {
  return new Date(instante.getTime() + dias * DIA_MS)
}

export interface AnuncioNaGuarda {
  situacao: Situacao
  expiraEm: Date | null
  criadoEm: Date
}

/** Publicado ou desativado: tem prazo, e depois dele vira vencido (RN-142). */
function temPrazo(anuncio: AnuncioNaGuarda): anuncio is AnuncioNaGuarda & { expiraEm: Date } {
  return (anuncio.situacao === "PUBLICADO" || anuncio.situacao === "DESATIVADO") && anuncio.expiraEm !== null
}

/**
 * RN-182 e RN-184: até quando o anúncio fica guardado; depois disso, a rodada diária o apaga.
 * Com prazo, conta do fim do prazo atual (renovar muda a data); nunca publicado, da criação. Removido e apagado: null (RN-188).
 */
export function guardadoAte(anuncio: AnuncioNaGuarda): Date | null {
  if (anuncio.situacao === "AGUARDANDO_PAGAMENTO") return somarDias(anuncio.criadoEm, DIAS_DO_NUNCA_PUBLICADO)
  return temPrazo(anuncio) ? somarDias(anuncio.expiraEm, DIAS_GUARDADO) : null
}

/** RN-183: até quando as mensagens podem ser lidas. Só anúncio com prazo recebe mensagem (RN-17); nos outros, null. */
export function mensagensAte(anuncio: AnuncioNaGuarda): Date | null {
  return temPrazo(anuncio) ? somarDias(anuncio.expiraEm, DIAS_DAS_MENSAGENS) : null
}

/** RN-183: as mensagens deste anúncio já passaram do prazo de leitura? */
export function mensagensVencidas(anuncio: AnuncioNaGuarda, agora: Date): boolean {
  const ate = mensagensAte(anuncio)
  return ate !== null && ate.getTime() <= agora.getTime()
}

export interface CortesDaRodada {
  /** RN-183: mensagens de anúncio com fim do prazo até aqui são apagadas. */
  mensagensVencidasAte: Date
  /** RN-182: anúncio com fim do prazo até aqui é apagado. */
  vencidosAte: Date
  /** RN-184: anúncio nunca publicado criado até aqui é apagado. */
  criadosAte: Date
  /** RF-183: anúncio com fim do prazo até aqui (e depois de `vencidosAte`) é apagado nos próximos 7 dias: recebe o aviso. */
  avisarVencidosAte: Date
}

/** RF-182: os cortes da rodada de `agora`. Entra quem venceu (ou foi criado) no instante do corte ou antes. */
export function cortesDaRodada(agora: Date): CortesDaRodada {
  return {
    mensagensVencidasAte: somarDias(agora, -DIAS_DAS_MENSAGENS),
    vencidosAte: somarDias(agora, -DIAS_GUARDADO),
    criadosAte: somarDias(agora, -DIAS_DO_NUNCA_PUBLICADO),
    avisarVencidosAte: somarDias(agora, -(DIAS_GUARDADO - DIAS_DO_AVISO_ANTES_DE_APAGAR)),
  }
}

// ── Aviso antes de apagar (RF-183) ──

// O dia que o dono vê é o de Brasília.
const DIA = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" })

export interface DadosDoAvisoDeApagar {
  dono: { nome: string }
  anuncio: { codigo: string; titulo: string; expiraEm: Date }
  /** O anúncio em Minha conta, onde se renova. */
  linkParaRenovar: string
}

/** RF-183: o que o dono lê 7 dias antes de o vencido ser apagado. Do cadastro, só o primeiro nome (RN-125). */
export function montarAvisoDeApagar(dados: DadosDoAvisoDeApagar): Carta {
  const { anuncio } = dados
  const ate = DIA.format(somarDias(anuncio.expiraEm, DIAS_GUARDADO))
  return {
    assunto: `Seu anúncio "${anuncio.titulo}" fica guardado até ${ate}`,
    saudacao: `Olá, ${primeiroNome(dados.dono.nome)}.`,
    paragrafos: [
      `Seu anúncio "${anuncio.titulo}" (código ${anuncio.codigo}) saiu do caderno em ${DIA.format(anuncio.expiraEm)} e está guardado em Minha conta, em Expirados.`,
      `O anúncio vencido fica guardado por ${DIAS_GUARDADO} dias. Depois de ${ate}, ele é apagado de vez, com o texto e as fotos, e não dá para recuperar.`,
      "Para não perder o anúncio, renove antes dessa data: ele volta ao caderno com o mesmo texto e as mesmas fotos.",
    ],
    citacao: null,
    linhas: [],
    botao: { rotulo: "Renovar o anúncio", url: dados.linkParaRenovar },
    observacoes: [
      "Se não precisa mais do anúncio, não faça nada.",
      // RN-125
      "Renovar é sempre pelo site, em Minha conta. O Classificados não pede pagamento por mensagem, e-mail ou telefone.",
    ],
    rodape: `Você recebeu este aviso porque tem um anúncio vencido guardado no ${NOME_DO_JORNAL}.`,
    responderPara: null,
  }
}
