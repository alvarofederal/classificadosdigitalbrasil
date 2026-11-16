// APLICAÇÃO — convites de cortesia (feature 015: RF-250 a RF-256, RN-250 a RN-257; ADR-22).

import { ALFABETO_DO_CODIGO } from "@/domain/anuncio/anuncio"
import { podeReceberEmail } from "@/domain/anuncio/vencimento"
import { PRESENTE_DE_BOAS_VINDAS, type SaldoDoBanco } from "@/domain/banco/banco-de-dias"
import {
  type CanalDoConvite,
  PREMIO_DO_CONVITE,
  VALIDADE_DO_CONVITE_MS,
  conviteAceitavel,
  convitesDisponiveis,
  montarCartaDoConvite,
  textoDoConviteNoWhatsApp,
} from "@/domain/convite/convite"
import { primeiroNome } from "@/domain/shared/carta"
import { type Result, falha, falhaDeValidacao, ok } from "@/domain/shared/result"
import { emailCanonico } from "@/domain/usuario/codigo-por-email"
import { emailValido } from "@/domain/usuario/usuario"
import type { GeradorDeToken, UsuarioRegistro, UsuarioRepository } from "../../ports/acesso"
import type { BancoDeDiasRepository } from "../../ports/banco"
import type { ConfiguracaoRepository } from "../../ports/caderno"
import type { AoPublicarPelaPrimeiraVez, ConviteRegistro, ConviteRepository } from "../../ports/convites"
import type { Correio, EnderecosDoSite } from "../../ports/correio"
import type { GeradorDeCodigo, Relogio } from "../../ports/sistema"

/** O código do link: 12 letras do alfabeto do anúncio (sem letras que se confundem), uns 7 × 10¹⁷ possíveis. */
const TAMANHO_DO_CODIGO_DO_CONVITE = 12

export interface DepsDosConvites {
  convites: ConviteRepository
  usuarios: UsuarioRepository
  configuracao: ConfiguracaoRepository
  codigos: GeradorDeCodigo
  /** RN-256: o hash do código é o mesmo SHA-256 da sessão. */
  tokens: GeradorDeToken
  relogio: Relogio
  enderecos: EnderecosDoSite
}

/** O presente que o convite anuncia: o de boas-vindas, se estiver ligado (RN-257). */
async function presenteAnunciado(configuracao: ConfiguracaoRepository): Promise<SaldoDoBanco | null> {
  return (await configuracao.presenteLigado()) ? PRESENTE_DE_BOAS_VINDAS : null
}

/** Confere se a conta pode convidar agora e devolve quem convida. */
async function conferirQuemConvida(deps: DepsDosConvites, usuarioId: string): Promise<Result<UsuarioRegistro>> {
  // RN-255
  if (!(await deps.configuracao.convitesLigados())) return falha("CONVITES_DESLIGADOS", "Os convites estão suspensos no momento.")
  const usuario = await deps.usuarios.buscarPorId(usuarioId)
  if (!usuario || usuario.perfil !== "ANUNCIANTE" || !usuario.ativo) return falha("NAO_ENCONTRADO", "Conta não encontrada.")
  const meus = await deps.convites.doConvidante(usuarioId)
  // RN-250
  if (convitesDisponiveis(meus, deps.relogio.agora()) === 0) return falha("SEM_CONVITES", "Você não tem convites disponíveis.")
  return ok(usuario)
}

async function novoConvite(deps: DepsDosConvites, usuarioId: string, canal: CanalDoConvite, emailDestino: string | null) {
  const agora = deps.relogio.agora()
  const codigo = deps.codigos.codigo(ALFABETO_DO_CODIGO, TAMANHO_DO_CODIGO_DO_CONVITE)
  const expiraEm = new Date(agora.getTime() + VALIDADE_DO_CONVITE_MS)
  const id = await deps.convites.inserir({
    convidanteId: usuarioId,
    canal,
    emailDestino,
    codigoHash: deps.tokens.hash(codigo),
    criadoEm: agora,
    expiraEm,
    aceitoPorId: null,
    aceitoEm: null,
    premiadoEm: null,
    canceladoEm: null,
  })
  return { id, codigo, link: deps.enderecos.convite(codigo), expiraEm }
}

/** RF-251: convite por e-mail. */
export class ConvidarPorEmailUseCase {
  constructor(
    private readonly deps: DepsDosConvites,
    private readonly correio: Correio,
  ) {}

  async executar(usuarioId: string, emailDigitado: string): Promise<Result<{ email: string }>> {
    const email = emailDigitado.trim().toLowerCase()
    if (!emailValido(email) || !podeReceberEmail(email)) return falhaDeValidacao({ email: "Informe um e-mail válido." })
    const quem = await conferirQuemConvida(this.deps, usuarioId)
    if (!quem.ok) return quem
    // RN-253
    if (emailCanonico(email) === emailCanonico(quem.valor.email)) return falhaDeValidacao({ email: "Este é o seu próprio e-mail." })
    if (await this.deps.usuarios.existeEmail(email)) return falhaDeValidacao({ email: "Este e-mail já tem conta no Classificados." })
    const agora = this.deps.relogio.agora()
    const repetido = (await this.deps.convites.doConvidante(usuarioId)).some(
      (c) => c.emailDestino && emailCanonico(c.emailDestino) === emailCanonico(email) && conviteAceitavel(c, agora),
    )
    if (repetido) return falhaDeValidacao({ email: "Você já convidou este e-mail; o convite ainda vale." })
    if (!this.correio.ligado) return falha("SEM_CORREIO", "Não foi possível enviar o convite agora. Tente de novo em alguns minutos.")

    const convite = await novoConvite(this.deps, usuarioId, "EMAIL", email)
    const carta = montarCartaDoConvite({ nomeDeQuemConvida: quem.valor.nome, link: convite.link, presente: await presenteAnunciado(this.deps.configuracao), expiraEm: convite.expiraEm })
    const envio = await this.correio.enviar({ nome: email, email }, carta)
    if (!envio.ok) {
      // O convite que não saiu volta (RN-250).
      await this.deps.convites.cancelar(convite.id, usuarioId, agora)
      console.error("[convite] e-mail não enviado", envio.codigo, envio.mensagem)
      return falha("ENVIO_FALHOU", "Não foi possível enviar o convite agora. Tente de novo em alguns minutos.")
    }
    return ok({ email })
  }
}

/** RF-252: convite pelo WhatsApp; vale para quem tiver o link (RN-252). */
export class ConvidarPeloWhatsAppUseCase {
  constructor(private readonly deps: DepsDosConvites) {}

  async executar(usuarioId: string): Promise<Result<{ link: string; texto: string }>> {
    const quem = await conferirQuemConvida(this.deps, usuarioId)
    if (!quem.ok) return quem
    const convite = await novoConvite(this.deps, usuarioId, "WHATSAPP", null)
    return ok({ link: convite.link, texto: textoDoConviteNoWhatsApp({ link: convite.link, presente: await presenteAnunciado(this.deps.configuracao) }) })
  }
}

export interface ConviteParaAPagina {
  nomeDeQuemConvida: string
  canal: CanalDoConvite
  emailDestino: string | null
  presente: SaldoDoBanco | null
}

async function conviteValido(deps: DepsDosConvites, codigo: string): Promise<Result<ConviteRegistro>> {
  if (!(await deps.configuracao.convitesLigados())) return falha("CONVITES_DESLIGADOS", "Os convites estão suspensos no momento.")
  const convite = await deps.convites.porCodigoHash(deps.tokens.hash(codigo.trim().toUpperCase()))
  if (!convite || !conviteAceitavel(convite, deps.relogio.agora())) return falha("CONVITE_INVALIDO", "Este convite não vale mais.")
  return ok(convite)
}

/** RF-253: o que a página do convite mostra. */
export class VerConviteUseCase {
  constructor(private readonly deps: DepsDosConvites) {}

  async executar(codigo: string): Promise<Result<ConviteParaAPagina>> {
    const valido = await conviteValido(this.deps, codigo)
    if (!valido.ok) return valido
    const quem = await this.deps.usuarios.buscarPorId(valido.valor.convidanteId)
    if (!quem || !quem.ativo) return falha("CONVITE_INVALIDO", "Este convite não vale mais.")
    return ok({
      nomeDeQuemConvida: primeiroNome(quem.nome),
      canal: valido.valor.canal,
      emailDestino: valido.valor.emailDestino,
      presente: await presenteAnunciado(this.deps.configuracao),
    })
  }
}

/** RF-254: liga a conta nova ao convite. Chamado pelo cadastro; nunca impede a conta de ser criada. */
export class AceitarConviteUseCase {
  constructor(private readonly deps: DepsDosConvites) {}

  async aceitar(codigo: string, conta: { id: string; email: string }): Promise<boolean> {
    const valido = await conviteValido(this.deps, codigo)
    if (!valido.ok || valido.valor.convidanteId === conta.id) return false
    // RN-252: o convite por e-mail só vale para a conta criada com aquele e-mail.
    if (valido.valor.canal === "EMAIL" && (!valido.valor.emailDestino || emailCanonico(valido.valor.emailDestino) !== emailCanonico(conta.email))) return false
    return this.deps.convites.aceitar(valido.valor.id, conta.id, this.deps.relogio.agora())
  }
}

/** RF-254 e RN-254: na primeira publicação de quem foi convidado, quem convidou ganha 7 dias com foto, uma vez. */
export class PremiarConviteUseCase implements AoPublicarPelaPrimeiraVez {
  constructor(
    private readonly convites: ConviteRepository,
    private readonly banco: BancoDeDiasRepository,
    private readonly relogio: Relogio,
  ) {}

  async aoPublicar(usuarioId: string): Promise<void> {
    const convite = await this.convites.aceitoPor(usuarioId)
    if (!convite || convite.premiadoEm) return
    if (!(await this.convites.premiar(convite.id, this.relogio.agora()))) return
    await this.banco.creditar(convite.convidanteId, PREMIO_DO_CONVITE.tipo, PREMIO_DO_CONVITE.dias, "CONVITE")
  }
}

/** RF-255: o convite ainda não aceito pode ser cancelado, e volta (RN-250). */
export class CancelarConviteUseCase {
  constructor(private readonly deps: Pick<DepsDosConvites, "convites" | "relogio">) {}

  async executar(usuarioId: string, conviteId: string): Promise<Result<true>> {
    const cancelou = await this.deps.convites.cancelar(conviteId, usuarioId, this.deps.relogio.agora())
    return cancelou ? ok(true) : falha("NAO_CANCELADO", "Este convite já foi aceito ou não existe mais.")
  }
}
