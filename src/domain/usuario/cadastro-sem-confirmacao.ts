// DOMÍNIO — cadastro sem confirmação: o Álvaro manda um e-mail, a pessoa continua ou desiste (feature 024: RN-240, RN-245, RN-248).
// Quem guarda o contato e apaga a conta é a aplicação; aqui ficam os prazos, a escolha do endereço e a carta.

import { type Carta, NOME_DO_JORNAL, primeiroNome } from "../shared/carta"

/** RN-240: a conta só entra no lembrete depois de 1 hora sem o código, para a pessoa ter tempo de digitá-lo. */
export const ESPERA_ANTES_DO_CONTATO_MS = 60 * 60_000

/** RN-245: sem resposta, a conta é apagada 7 dias depois do último e-mail. */
export const DIAS_PARA_RESPONDER = 7
const DIA_MS = 86_400_000

export const ESCOLHAS_DO_CADASTRO = ["continuar", "desistir"] as const
export type EscolhaDoCadastro = (typeof ESCOLHAS_DO_CADASTRO)[number]

/** A escolha que veio no link do e-mail (`?escolha=`); qualquer outro valor não escolhe nada. */
export function escolhaDoEndereco(valor: string | null | undefined): EscolhaDoCadastro | null {
  return ESCOLHAS_DO_CADASTRO.find((e) => e === valor) ?? null
}

/** RN-245: até quando a pessoa pode responder. */
export function prazoParaApagar(contatoEnviadoEm: Date): Date {
  return new Date(contatoEnviadoEm.getTime() + DIAS_PARA_RESPONDER * DIA_MS)
}

/** RF-243: os contatos mandados até este instante já passaram do prazo. */
export function limiteSemResposta(agora: Date): Date {
  return new Date(agora.getTime() - DIAS_PARA_RESPONDER * DIA_MS)
}

/** RN-240: as contas criadas até este instante já podem entrar no lembrete. */
export function criadasAteParaContato(agora: Date): Date {
  return new Date(agora.getTime() - ESPERA_ANTES_DO_CONTATO_MS)
}

/** RN-240: a conta sem confirmação espera o contato do Álvaro? */
export function esperaContato(cadastro: { criadoEm: Date; contatoEnviadoEm: Date | null }, agora: Date): boolean {
  return cadastro.contatoEnviadoEm === null && cadastro.criadoEm.getTime() <= criadasAteParaContato(agora).getTime()
}

const DIA = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" })

/** "20/11/2026", no fuso de Brasília (Art. 3.3). */
export function diaDoCadastro(instante: Date): string {
  return DIA.format(instante)
}

/** RN-248: só o primeiro nome, a data do cadastro, os dois caminhos e o prazo. */
export function montarCartaContinuarOuDesistir(dados: {
  nome: string
  criadoEm: Date
  prazo: Date
  linkContinuar: string
  linkDesistir: string
}): Carta {
  return {
    assunto: "Sua conta no Classificados: continuar ou desistir?",
    saudacao: `Olá, ${primeiroNome(dados.nome)}.`,
    paragrafos: [
      `Você criou uma conta no ${NOME_DO_JORNAL} em ${diaDoCadastro(dados.criadoEm)}, mas o e-mail ainda não foi confirmado. Sem a confirmação, a conta não publica anúncios.`,
      "Para continuar, use o botão Continuar com a minha conta: a conta fica confirmada e você entra com o seu e-mail e a sua senha.",
      `Se não quiser mais a conta, use o botão Apagar minha conta. Sem resposta até ${diaDoCadastro(dados.prazo)}, a conta será apagada.`,
    ],
    citacao: null,
    linhas: [],
    botao: { rotulo: "Continuar com a minha conta", url: dados.linkContinuar },
    segundoBotao: { rotulo: "Apagar minha conta", url: dados.linkDesistir },
    observacoes: [
      "Os dois botões abrem uma página do site; nada muda antes do seu clique no botão de lá.",
      "Se não foi você que criou esta conta, use Apagar minha conta ou apenas ignore este e-mail.",
    ],
    rodape: `Você recebeu este e-mail porque este endereço foi usado para criar uma conta no ${NOME_DO_JORNAL}.`,
    responderPara: null,
  }
}
