// DOMÍNIO — aviso por e-mail ao dono do anúncio quando chega mensagem (feature 010: RF-100, RF-101, RN-101 a RN-105).

import type { Carta } from "../shared/carta"
import { somenteDigitos } from "../shared/texto"
import type { NovaMensagem } from "./mensagem"

/** RN-101: avisos por anúncio na janela, contados pelas mensagens recebidas. */
export const AVISOS_POR_ANUNCIO_POR_DIA = 10
export const JANELA_DOS_AVISOS_MS = 86_400_000

/** RN-101: a mensagem de número `recebidasNoDia` (contando ela mesma) ainda gera aviso? */
export function deveAvisar(recebidasNoDia: number): boolean {
  return recebidasNoDia <= AVISOS_POR_ANUNCIO_POR_DIA
}

/** Só letras, números e `._%+-` antes da arroba; domínio com pelo menos um ponto. */
const EMAIL_SIMPLES = /^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]{1,63}(\.[A-Za-z0-9-]{1,63})+$/

/**
 * RN-103: o contato de quem escreveu só vira endereço de resposta quando é um e-mail em formato simples.
 * Aspas, sinais de maior e menor, vírgulas e parênteses poderiam mudar o destinatário no cabeçalho do e-mail.
 */
export function emailParaResposta(contato: string): string | null {
  const limpo = contato.trim()
  return limpo.length <= 120 && EMAIL_SIMPLES.test(limpo) ? limpo : null
}

/** RF-101: telefone brasileiro com DDD vira o link de conversa do WhatsApp. */
export function linkDoWhatsApp(contato: string): string | null {
  if (contato.includes("@")) return null
  const digitos = somenteDigitos(contato)
  if (digitos.length === 10 || digitos.length === 11) return `https://wa.me/55${digitos}`
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith("55")) return `https://wa.me/${digitos}`
  return null
}

function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? ""
}

const RODAPE = "Classificados Digitais do Brasil"

export interface DadosDoAvisoDeMensagem {
  dono: { nome: string }
  anuncio: { codigo: string; titulo: string }
  mensagem: NovaMensagem
  /** Endereço da lista de mensagens do anúncio em Minha conta. */
  linkDasMensagens: string
  /** Mensagens que o anúncio recebeu na janela, contando esta. */
  recebidasNoDia: number
}

/**
 * RF-100: o que o dono lê quando alguém escreve. RN-102: nada do cadastro do dono entra aqui além do nome.
 * O contato de quem escreveu vai só nesta carta, que segue apenas para o dono (Art. 5).
 */
export function montarAvisoDeMensagemNova(dados: DadosDoAvisoDeMensagem): Carta {
  const { anuncio, mensagem } = dados
  const email = emailParaResposta(mensagem.contato)
  const whatsapp = linkDoWhatsApp(mensagem.contato)

  const linhas: Carta["linhas"] = [{ rotulo: "Responder para", valor: mensagem.contato, link: email ? `mailto:${email}` : null }]
  if (whatsapp) linhas.push({ rotulo: "WhatsApp", valor: "abrir conversa com este número", link: whatsapp })

  const observacoes = [
    email ? `Responder a este e-mail envia a resposta direto para ${mensagem.nome}.` : "Este e-mail é automático: responda pelo contato acima.",
    // RN-105
    "O Classificados não pede pagamento, código nem senha por mensagem. Desconfie de links e de pedido de pagamento adiantado.",
  ]
  if (dados.recebidasNoDia >= AVISOS_POR_ANUNCIO_POR_DIA) {
    observacoes.push(`Este é o ${AVISOS_POR_ANUNCIO_POR_DIA}º aviso deste anúncio em 24 horas. As próximas mensagens de hoje ficam só em Minha conta.`)
  }

  return {
    assunto: `Nova mensagem no seu anúncio "${anuncio.titulo}"`,
    saudacao: `Olá, ${primeiroNome(dados.dono.nome)}.`,
    paragrafos: [`${mensagem.nome} escreveu sobre o seu anúncio "${anuncio.titulo}" (código ${anuncio.codigo}).`],
    citacao: { autor: mensagem.nome, texto: mensagem.texto },
    linhas,
    botao: { rotulo: "Ver a mensagem em Minha conta", url: dados.linkDasMensagens },
    observacoes,
    rodape: `Você recebeu este aviso porque alguém escreveu para um anúncio seu no ${RODAPE}.`,
    responderPara: email ? { nome: mensagem.nome, email } : null,
  }
}

/** RF-103: e-mail que o administrador manda para si mesmo pelo painel, para conferir o envio. */
export function montarEmailDeTeste(nome: string): Carta {
  return {
    assunto: "E-mail de teste do Classificados",
    saudacao: `Olá, ${primeiroNome(nome)}.`,
    paragrafos: [
      "Este é o e-mail de teste enviado pelo painel. Se ele chegou, o aviso de mensagem nova está funcionando.",
      "A partir de agora, cada mensagem recebida num anúncio vira um e-mail como este para o dono do anúncio.",
    ],
    citacao: null,
    linhas: [],
    botao: null,
    observacoes: ["Se este e-mail caiu no spam, marque como \"não é spam\" para os próximos chegarem na caixa de entrada."],
    rodape: `Você recebeu este e-mail porque pediu um teste em Painel → Configurações do ${RODAPE}.`,
    responderPara: null,
  }
}
