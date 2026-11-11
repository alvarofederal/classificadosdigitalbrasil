// INFRAESTRUTURA — correio por SMTP com nodemailer (feature 010, ADR-15 e ADR-16).
// Serve a qualquer provedor (Gmail com senha de app, Brevo, Hostinger): trocar de provedor é trocar as variáveis.
// O Resend entra só com a chave da API (RESEND_API_KEY), pelo servidor SMTP dele.

import nodemailer from "nodemailer"
import type { Correio } from "@/application/ports/correio"
import type { Carta, Destinatario } from "@/domain/shared/carta"
import { type Result, falha, ok } from "@/domain/shared/result"
import { cartaEmHtml, cartaEmTexto, emUmaLinha } from "./modelo"

export interface ConfiguracaoSmtp {
  host: string
  porta: number
  usuario: string
  senha: string
  /** Endereço que aparece como remetente. */
  remetente: string
  /** Variável que guarda a credencial, quando não são as do SMTP: o painel cita a certa se o login falha. */
  credencial?: string
}

export type LeituraDoSmtp = { ok: true; cfg: ConfiguracaoSmtp } | { ok: false; faltam: string[] }

/** Servidor SMTP do Resend (ADR-16): o usuário é fixo e a senha é a chave da API. */
const SMTP_DO_RESEND = { host: "smtp.resend.com", porta: 465, usuario: "resend" } as const
/** RN-107: domínio já autenticado na conta do Resend, o mesmo dos outros sistemas. */
export const REMETENTE_PADRAO_DO_RESEND = "noreply@karollynemorais.com.br"

const HOST = /^[A-Za-z0-9.-]{1,253}$/
const EMAIL_DO_REMETENTE = /^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]{1,63}(\.[A-Za-z0-9-]{1,63})+$/
/** Endereço de destino: sem espaço e sem os sinais que formam listas e nomes num cabeçalho de e-mail. */
const ENDERECO_SEGURO = /^[^\s<>"(),;:\\[\]@]{1,64}@[^\s<>"(),;:\\[\]@]{1,190}\.[^\s<>"(),;:\\[\]@.]{2,63}$/
/** O Google mostra a senha de app em quatro grupos de quatro letras; os espaços são só de leitura. */
const SENHA_DE_APP_DO_GOOGLE = /^[a-z]{4}( [a-z]{4}){3}$/

/** Lê SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS e SMTP_FROM. Sem o essencial, diz o que falta (RF-103, RF-104). */
export function lerConfiguracaoSmtp(env: Record<string, string | undefined>): LeituraDoSmtp {
  const host = env.SMTP_HOST?.trim() ?? ""
  const usuario = env.SMTP_USER?.trim() ?? ""
  const senhaLida = env.SMTP_PASS?.trim() ?? ""
  const senha = SENHA_DE_APP_DO_GOOGLE.test(senhaLida) ? senhaLida.replace(/ /g, "") : senhaLida
  const portaLida = env.SMTP_PORT?.trim() ?? ""
  const porta = portaLida ? Number(portaLida) : 465
  const remetente = env.SMTP_FROM?.trim() || usuario

  const faltam: string[] = []
  if (!HOST.test(host)) faltam.push("SMTP_HOST")
  if (!usuario) faltam.push("SMTP_USER")
  if (!senha) faltam.push("SMTP_PASS")
  if (!Number.isInteger(porta) || porta < 1 || porta > 65535) faltam.push("SMTP_PORT")
  // Em provedores como o Brevo o usuário não é um endereço: o remetente precisa vir em SMTP_FROM.
  if (usuario && !EMAIL_DO_REMETENTE.test(remetente)) faltam.push("SMTP_FROM")
  if (faltam.length > 0) return { ok: false, faltam }
  return { ok: true, cfg: { host, porta, usuario, senha, remetente } }
}

/** `endereco@dominio` ou `Nome <endereco@dominio>`, como o EMAIL_FROM dos outros sistemas. Devolve só o endereço. */
function enderecoDoRemetente(valor: string): string | null {
  const entreSinais = /^[^<>]*<([^<>]+)>$/.exec(valor)
  const endereco = (entreSinais ? entreSinais[1] : valor).trim()
  return EMAIL_DO_REMETENTE.test(endereco) ? endereco : null
}

/**
 * RN-106: escolhe o servidor de envio. SMTP informado tem preferência; sem ele, a chave do Resend basta (RF-106);
 * sem nenhum dos dois, o aviso fica desligado (RF-104) e o painel pede o caminho mais curto, a chave do Resend.
 */
export function lerConfiguracaoDoCorreio(env: Record<string, string | undefined>): LeituraDoSmtp {
  const temSmtp = [env.SMTP_HOST, env.SMTP_USER, env.SMTP_PASS].some((valor) => valor?.trim())
  if (temSmtp) return lerConfiguracaoSmtp(env)

  const chave = env.RESEND_API_KEY?.trim() ?? ""
  if (!chave) return { ok: false, faltam: ["RESEND_API_KEY"] }
  // Chave com espaço ou quebra de linha é erro de cópia: melhor dizer no painel do que falhar no login.
  if (/\s/.test(chave)) return { ok: false, faltam: ["RESEND_API_KEY"] }

  const informado = env.EMAIL_FROM?.trim() ?? ""
  const remetente = informado ? enderecoDoRemetente(informado) : REMETENTE_PADRAO_DO_RESEND
  if (!remetente) return { ok: false, faltam: ["EMAIL_FROM"] }
  return { ok: true, cfg: { ...SMTP_DO_RESEND, senha: chave, remetente, credencial: "RESEND_API_KEY" } }
}

interface Endereco {
  name: string
  address: string
}

export interface MensagemDeEmail {
  from: Endereco
  to: Endereco
  replyTo?: Endereco
  subject: string
  text: string
  html: string
  headers: Record<string, string>
}

/** O que o correio usa do nodemailer. Nos testes entra um transporte de mentira. */
export interface TransporteDeEmail {
  enviar(mensagem: MensagemDeEmail): Promise<{ messageId?: string; rejected?: unknown[] }>
  conferir(): Promise<unknown>
}

export function criarTransporteSmtp(cfg: ConfiguracaoSmtp): TransporteDeEmail {
  const transporte = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.porta,
    // 465 fala TLS desde o primeiro byte; nas outras portas o STARTTLS é obrigatório, para a senha nunca ir em claro.
    secure: cfg.porta === 465,
    requireTLS: cfg.porta !== 465,
    auth: { user: cfg.usuario, pass: cfg.senha },
    // Servidor lento não pode prender a função: o aviso roda depois da resposta, mas dentro do tempo dela.
    dnsTimeout: 5_000,
    connectionTimeout: 8_000,
    greetingTimeout: 8_000,
    socketTimeout: 15_000,
    // A carta é só texto e HTML: nenhum conteúdo é lido de arquivo ou de endereço externo.
    disableFileAccess: true,
    disableUrlAccess: true,
  })
  return {
    enviar: (mensagem) => transporte.sendMail(mensagem),
    conferir: () => transporte.verify(),
  }
}

/** Nome de exibição num cabeçalho de endereço: uma linha só e sem os sinais que formam endereços. */
function nomeDeExibicao(nome: string): string {
  return emUmaLinha(nome, 80)
    .replace(/[<>"\\,;:()[\]@]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Mensagem curta para o painel e para o log, sem senha nem resposta crua do servidor. */
function motivoDaFalha(erro: unknown, cfg: ConfiguracaoSmtp): string {
  const codigo = typeof erro === "object" && erro !== null && "code" in erro ? String((erro as { code: unknown }).code) : ""
  const texto = erro instanceof Error ? emUmaLinha(erro.message, 160) : "erro desconhecido"
  // No erro de login a resposta do servidor pode repetir o usuário: fica só a explicação.
  if (codigo === "EAUTH") {
    return cfg.credencial ? `O servidor ${cfg.host} recusou a chave (${cfg.credencial}).` : `O servidor ${cfg.host} recusou o usuário ou a senha (SMTP_USER e SMTP_PASS).`
  }
  if (["ECONNECTION", "ETIMEDOUT", "ESOCKET", "EDNS", "ECONNREFUSED", "ENOTFOUND", "ETLS"].includes(codigo)) {
    // Erro de rede ou de certificado não carrega credencial: o motivo ajuda a achar o defeito.
    const conexao = `Não foi possível conectar a ${cfg.host}:${cfg.porta} (${texto ? `${codigo}: ${texto}` : codigo}).`
    // Com a chave do Resend o servidor é fixo: não há variável de endereço para conferir.
    return cfg.credencial ? conexao : `${conexao} Confira SMTP_HOST e SMTP_PORT.`
  }
  if (codigo === "EENVELOPE") return "O servidor de e-mail recusou o endereço do remetente ou do destinatário."
  return `O servidor de e-mail não aceitou o envio${codigo ? ` (${codigo})` : ""}: ${texto}`
}

export class CorreioSmtp implements Correio {
  readonly ligado = true

  constructor(
    private readonly cfg: ConfiguracaoSmtp,
    private readonly nomeDoRemetente: string,
    private readonly transporte: TransporteDeEmail = criarTransporteSmtp(cfg),
  ) {}

  async enviar(para: Destinatario, carta: Carta): Promise<Result<{ id: string }>> {
    const destino = para.email.trim()
    if (destino.length > 254 || !ENDERECO_SEGURO.test(destino)) return falha("ENDERECO_INVALIDO", "O endereço de destino não serve para receber e-mail.")

    const mensagem: MensagemDeEmail = {
      from: { name: nomeDeExibicao(this.nomeDoRemetente), address: this.cfg.remetente },
      to: { name: nomeDeExibicao(para.nome), address: destino },
      subject: emUmaLinha(carta.assunto, 150),
      text: cartaEmTexto(carta),
      html: cartaEmHtml(carta),
      // Respostas automáticas (férias, fora do escritório) não devem voltar para o remetente do site.
      headers: { "Auto-Submitted": "auto-generated", "X-Auto-Response-Suppress": "All" },
    }
    // RN-103: o domínio só entrega endereço de resposta em formato simples; o nome é limpo aqui.
    if (carta.responderPara) mensagem.replyTo = { name: nomeDeExibicao(carta.responderPara.nome), address: carta.responderPara.email }

    try {
      const envio = await this.transporte.enviar(mensagem)
      if (envio.rejected && envio.rejected.length > 0) return falha("ENDERECO_RECUSADO", "O servidor de e-mail recusou o endereço de destino.")
      return ok({ id: envio.messageId ?? "" })
    } catch (erro) {
      // RN-100: falha de envio é valor, não exceção.
      return falha("ENVIO_FALHOU", motivoDaFalha(erro, this.cfg))
    }
  }

  async conferir(): Promise<Result<true>> {
    try {
      await this.transporte.conferir()
      return ok(true)
    } catch (erro) {
      return falha("CONEXAO_FALHOU", motivoDaFalha(erro, this.cfg))
    }
  }
}

/** RF-104: sem as variáveis do servidor, nada é enviado e o site funciona como antes. */
export class CorreioDesligado implements Correio {
  readonly ligado = false

  async enviar(): Promise<Result<{ id: string }>> {
    return falha("SEM_CORREIO", "O servidor de e-mail não está cadastrado.")
  }

  async conferir(): Promise<Result<true>> {
    return falha("SEM_CORREIO", "O servidor de e-mail não está cadastrado.")
  }
}
