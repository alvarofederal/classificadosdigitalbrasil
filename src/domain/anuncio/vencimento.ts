// DOMÍNIO — aviso por e-mail de que o anúncio está perto de sair do caderno (feature 012: RF-120, RN-122, RN-125).

import { type Carta, NOME_DO_JORNAL, primeiroNome } from "../shared/carta"

/**
 * RF-120: entram na rodada os anúncios que saem nas próximas 36 horas. Com uma rodada por dia,
 * todo anúncio é avisado com pelo menos 12 horas de antecedência, mesmo se o agendador atrasar (ADR-17).
 */
export const JANELA_DO_AVISO_DE_VENCIMENTO_MS = 36 * 3_600_000

/** RN-124: avisos por rodada; o que sobrar fica para a rodada seguinte. */
export const AVISOS_DE_VENCIMENTO_POR_RODADA = 200

/** RN-122: domínios reservados para teste e exemplo (RFC 2606): o e-mail não chega a ninguém. */
const DOMINIO_RESERVADO = /(\.(test|example|invalid|localhost)|(^|\.)example\.(com|net|org))$/i

/** RN-122: o endereço pode receber e-mail? Falso para domínio reservado e endereço sem domínio. */
export function podeReceberEmail(email: string): boolean {
  const partes = email.trim().split("@")
  const dominio = partes.length === 2 ? partes[1] : ""
  return dominio.includes(".") && !DOMINIO_RESERVADO.test(dominio)
}

// O dia e a hora que o dono vê na tela são os de Brasília.
const FUSO = "America/Sao_Paulo"
const DIA_ISO = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" })
const DIA_E_MES = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit" })
const HORA = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
const NUMERO = new Intl.NumberFormat("pt-BR")

export type DiaDaSaida = "HOJE" | "AMANHA" | "DEPOIS"

/** Quando o anúncio sai, do jeito que se fala: "hoje, às 14:26", "amanhã, 18/11, às 14:26". */
export function quandoSaiDoCaderno(expiraEm: Date, agora: Date): { dia: DiaDaSaida; texto: string; curto: string } {
  const diaDoFim = DIA_ISO.format(expiraEm)
  const hora = HORA.format(expiraEm)
  const diaEMes = DIA_E_MES.format(expiraEm)
  if (diaDoFim === DIA_ISO.format(agora)) return { dia: "HOJE", texto: `hoje, às ${hora}`, curto: "hoje" }
  if (diaDoFim === DIA_ISO.format(new Date(agora.getTime() + 86_400_000))) {
    return { dia: "AMANHA", texto: `amanhã, ${diaEMes}, às ${hora}`, curto: "amanhã" }
  }
  return { dia: "DEPOIS", texto: `em ${diaEMes}, às ${hora}`, curto: `em ${diaEMes}` }
}

export interface DadosDoAvisoDeVencimento {
  dono: { nome: string }
  anuncio: { codigo: string; titulo: string; expiraEm: Date; visualizacoes: number }
  agora: Date
  /** O anúncio em Minha conta, onde se renova. */
  linkParaRenovar: string
  /** Página pública do anúncio. */
  linkDoAnuncio: string
}

/** RF-120: o que o dono lê quando o anúncio está para sair. RN-125: do cadastro, só o primeiro nome. */
export function montarAvisoDeVencimento(dados: DadosDoAvisoDeVencimento): Carta {
  const { anuncio } = dados
  const quando = quandoSaiDoCaderno(anuncio.expiraEm, dados.agora)
  const paragrafos = [`Seu anúncio "${anuncio.titulo}" (código ${anuncio.codigo}) sai do caderno ${quando.texto}.`]
  if (anuncio.visualizacoes > 0) {
    const visitas = `${NUMERO.format(anuncio.visualizacoes)} ${anuncio.visualizacoes === 1 ? "visita" : "visitas"}`
    paragrafos.push(`Até agora ele teve ${visitas} na página do anúncio.`)
  }
  // RN-12: renovar antes do fim soma os dias depois do prazo atual.
  paragrafos.push("Para continuar no caderno, renove em Minha conta. Renovando antes do fim, os dias novos entram depois do prazo atual, sem perder nenhum.")

  return {
    assunto: `Seu anúncio "${anuncio.titulo}" sai do caderno ${quando.curto}`,
    saudacao: `Olá, ${primeiroNome(dados.dono.nome)}.`,
    paragrafos,
    citacao: null,
    linhas: [{ rotulo: "Página do anúncio", valor: dados.linkDoAnuncio, link: dados.linkDoAnuncio }],
    botao: { rotulo: "Renovar o anúncio", url: dados.linkParaRenovar },
    observacoes: [
      "Se já vendeu, não precisa fazer nada: o anúncio sai sozinho no fim do prazo.",
      // RN-125
      "Renovar é sempre pelo site, em Minha conta. O Classificados não pede pagamento por mensagem, e-mail ou telefone.",
    ],
    rodape: `Você recebeu este aviso porque tem um anúncio perto do fim do prazo no ${NOME_DO_JORNAL}.`,
    responderPara: null,
  }
}
