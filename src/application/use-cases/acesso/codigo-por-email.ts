// APLICAÇÃO — código por e-mail: confirmar o cadastro, trocar o e-mail e criar senha nova (feature 016: RF-150 a RF-155; RN-150 a RN-158).

import { type Result, falha, falhaDeValidacao, ok } from "@/domain/shared/result"
import {
  CODIGOS_POR_HORA,
  DIGITOS_DO_CODIGO,
  type FinalidadeDoCodigo,
  TAMANHO_DO_CODIGO,
  TENTATIVAS_POR_CODIGO,
  VALIDADE_DO_CODIGO_MS,
  codigoNoFormato,
  montarAvisoDeEmailTrocado,
  montarCartaDoCodigo,
  normalizarCodigo,
  segundosParaOutroCodigo,
} from "@/domain/usuario/codigo-por-email"
import { emailValido, validarNovaSenha } from "@/domain/usuario/usuario"
import type { Perfil } from "@/domain/usuario/usuario"
import type {
  CodigoPorEmailRegistro,
  CodigoPorEmailRepository,
  GeradorDeToken,
  HashDeSenha,
  SessaoRepository,
  UsuarioRegistro,
  UsuarioRepository,
} from "../../ports/acesso"
import type { Correio, EnderecosDoSite } from "../../ports/correio"
import type { GeradorDeCodigo, Relogio, SegundoPlano } from "../../ports/sistema"
import { abrirSessao } from "./autenticar-usuario"

export interface DepsDoCodigo {
  codigosPorEmail: CodigoPorEmailRepository
  correio: Correio
  codigos: GeradorDeCodigo
  /** O hash do código é o mesmo SHA-256 dos tokens de sessão (RN-150). */
  tokens: GeradorDeToken
  relogio: Relogio
}

const SEM_ENVIO = "Não foi possível enviar o código agora. Tente de novo em alguns minutos."

/** Gera, guarda (só o hash) e envia um código. Respeita o intervalo e o limite por hora (RN-152). */
export async function emitirCodigo(
  deps: DepsDoCodigo,
  usuario: Pick<UsuarioRegistro, "id" | "nome">,
  finalidade: FinalidadeDoCodigo,
  email: string,
): Promise<Result<{ enviadoPara: string }>> {
  // RN-158: sem servidor de e-mail o código não sai, e nada fica registrado.
  if (!deps.correio.ligado) return falha("SEM_CORREIO", SEM_ENVIO)
  const agora = deps.relogio.agora()
  const recentes = await deps.codigosPorEmail.criadosDesde(usuario.id, finalidade, new Date(agora.getTime() - 3_600_000))
  const ultimo = recentes.reduce<Date | null>((maior, d) => (!maior || d > maior ? d : maior), null)
  const espera = segundosParaOutroCodigo(ultimo, agora)
  if (espera > 0) return falha("AGUARDE", `Aguarde ${espera} segundos para pedir outro código.`)
  if (recentes.length >= CODIGOS_POR_HORA) return falha("LIMITE_DE_CODIGOS", "Você já pediu muitos códigos. Tente de novo daqui a uma hora.")

  const codigo = deps.codigos.codigo(DIGITOS_DO_CODIGO, TAMANHO_DO_CODIGO)
  // RN-152: o código novo invalida o anterior.
  await deps.codigosPorEmail.encerrarEmAberto(usuario.id, finalidade, agora)
  await deps.codigosPorEmail.inserir({
    usuarioId: usuario.id,
    finalidade,
    email,
    codigoHash: deps.tokens.hash(codigo),
    tentativas: 0,
    expiraEm: new Date(agora.getTime() + VALIDADE_DO_CODIGO_MS),
    encerradoEm: null,
    criadoEm: agora,
  })
  const envio = await deps.correio.enviar({ nome: usuario.nome, email }, montarCartaDoCodigo({ nome: usuario.nome, codigo, finalidade }))
  if (!envio.ok) {
    // No log, só a finalidade: o código e o endereço não aparecem.
    console.error("[código por e-mail] não enviado", finalidade, envio.codigo, envio.mensagem)
    return falha("ENVIO_FALHOU", SEM_ENVIO)
  }
  return ok({ enviadoPara: email })
}

/** Confere o código digitado: formato, validade, tentativas (RN-151) e uso único (RN-153). Acertou = encerrado. */
export async function conferirCodigo(
  deps: Pick<DepsDoCodigo, "codigosPorEmail" | "tokens" | "relogio">,
  usuarioId: string,
  finalidade: FinalidadeDoCodigo,
  digitado: string,
): Promise<Result<CodigoPorEmailRegistro>> {
  const codigo = normalizarCodigo(digitado)
  if (!codigoNoFormato(codigo)) return falhaDeValidacao({ codigo: `Digite os ${TAMANHO_DO_CODIGO} números do código.` })
  const agora = deps.relogio.agora()
  const aberto = await deps.codigosPorEmail.emAberto(usuarioId, finalidade)
  if (!aberto) return falhaDeValidacao({ codigo: "Peça um código novo." })
  if (aberto.expiraEm.getTime() <= agora.getTime()) return falhaDeValidacao({ codigo: "Este código venceu. Peça outro." })
  if (aberto.tentativas >= TENTATIVAS_POR_CODIGO) return falhaDeValidacao({ codigo: "Muitas tentativas erradas. Peça outro código." })

  if (deps.tokens.hash(codigo) !== aberto.codigoHash) {
    const restam = TENTATIVAS_POR_CODIGO - (await deps.codigosPorEmail.somarTentativa(aberto.id))
    if (restam <= 0) return falhaDeValidacao({ codigo: "Código incorreto. Peça outro código." })
    return falhaDeValidacao({ codigo: `Código incorreto. ${restam === 1 ? "Resta 1 tentativa" : `Restam ${restam} tentativas`}.` })
  }
  if (!(await deps.codigosPorEmail.encerrar(aberto.id, agora))) return falhaDeValidacao({ codigo: "Este código já foi usado. Peça outro." })
  return ok(aberto)
}

// ── Confirmar o cadastro (RF-150 a RF-152) ──

export class ConfirmarEmailUseCase {
  constructor(
    private readonly usuarios: UsuarioRepository,
    private readonly deps: DepsDoCodigo,
  ) {}

  async executar(usuarioId: string, digitado: string): Promise<Result<true>> {
    const usuario = await this.usuarios.buscarPorId(usuarioId)
    if (!usuario) return falha("NAO_ENCONTRADO", "Conta não encontrada.")
    if (usuario.emailConfirmadoEm) return ok(true)
    const conferido = await conferirCodigo(this.deps, usuario.id, "CADASTRO", digitado)
    if (!conferido.ok) return conferido
    // O código precisa ter ido para o e-mail atual da conta (o e-mail pode ter sido corrigido depois).
    if (conferido.valor.email !== usuario.email) return falhaDeValidacao({ codigo: "Este código foi para outro e-mail. Peça outro." })
    await this.usuarios.atualizar({ ...usuario, emailConfirmadoEm: this.deps.relogio.agora() })
    return ok(true)
  }
}

export class ReenviarCodigoDoCadastroUseCase {
  constructor(
    private readonly usuarios: UsuarioRepository,
    private readonly deps: DepsDoCodigo,
  ) {}

  async executar(usuarioId: string): Promise<Result<{ enviadoPara: string }>> {
    const usuario = await this.usuarios.buscarPorId(usuarioId)
    if (!usuario) return falha("NAO_ENCONTRADO", "Conta não encontrada.")
    if (usuario.emailConfirmadoEm) return falha("JA_CONFIRMADO", "Seu e-mail já está confirmado.")
    return emitirCodigo(this.deps, usuario, "CADASTRO", usuario.email)
  }
}

/** RF-152: quem digitou o e-mail errado no cadastro corrige antes de confirmar; o código novo vai para o corrigido. */
export class CorrigirEmailDoCadastroUseCase {
  constructor(
    private readonly usuarios: UsuarioRepository,
    private readonly deps: DepsDoCodigo,
  ) {}

  async executar(usuarioId: string, emailDigitado: string): Promise<Result<{ enviadoPara: string }>> {
    const usuario = await this.usuarios.buscarPorId(usuarioId)
    if (!usuario) return falha("NAO_ENCONTRADO", "Conta não encontrada.")
    if (usuario.emailConfirmadoEm) return falha("JA_CONFIRMADO", "Seu e-mail já está confirmado. Para trocar, use Meus dados.")
    const email = emailDigitado.trim().toLowerCase()
    if (!emailValido(email)) return falhaDeValidacao({ email: "Informe um e-mail válido." })
    if (email !== usuario.email && (await this.usuarios.existeEmail(email, usuario.id))) {
      return falhaDeValidacao({ email: "Já existe uma conta com este e-mail." })
    }
    if (email !== usuario.email) await this.usuarios.atualizar({ ...usuario, email })
    return emitirCodigo(this.deps, usuario, "CADASTRO", email)
  }
}

// ── Esqueci a senha (RF-153) ──

export const RESPOSTA_DO_ESQUECI_A_SENHA =
  "Se existir uma conta com este e-mail, mandamos um código para ele. O código vale por 15 minutos; se não chegar, confira a caixa de spam."

export class PedirNovaSenhaUseCase {
  constructor(
    private readonly usuarios: UsuarioRepository,
    private readonly deps: DepsDoCodigo,
    private readonly segundoPlano: SegundoPlano,
  ) {}

  /** RN-156: a resposta é a mesma exista ou não a conta, e o envio sai depois dela, para o tempo também não contar. */
  async executar(emailDigitado: string): Promise<Result<string>> {
    const email = emailDigitado.trim().toLowerCase()
    if (!emailValido(email)) return falhaDeValidacao({ email: "Informe um e-mail válido." })
    const usuario = await this.usuarios.buscarPorEmail(email)
    if (usuario?.ativo) {
      this.segundoPlano.executar(async () => {
        const envio = await emitirCodigo(this.deps, usuario, "NOVA_SENHA", usuario.email)
        if (!envio.ok) console.warn("[esqueci a senha] código não enviado", envio.codigo)
      })
    }
    return ok(RESPOSTA_DO_ESQUECI_A_SENHA)
  }
}

export class CriarNovaSenhaUseCase {
  constructor(
    private readonly usuarios: UsuarioRepository,
    private readonly sessoes: SessaoRepository,
    private readonly hash: HashDeSenha,
    private readonly deps: DepsDoCodigo,
  ) {}

  async executar(entrada: { email: string; codigo: string; novaSenha: string; confirmacaoSenha: string }): Promise<
    Result<{ token: string; expiraEm: Date; perfil: Perfil }>
  > {
    const erros = validarNovaSenha(entrada.novaSenha, entrada.confirmacaoSenha, {}, "novaSenha")
    if (Object.keys(erros).length > 0) return falhaDeValidacao(erros)
    const usuario = await this.usuarios.buscarPorEmail(entrada.email.trim().toLowerCase())
    // RN-156: conta inexistente ou desativada recebe a mesma resposta de código errado.
    if (!usuario || !usuario.ativo) return falhaDeValidacao({ codigo: "Código incorreto ou vencido. Peça outro." })
    const conferido = await conferirCodigo(this.deps, usuario.id, "NOVA_SENHA", entrada.codigo)
    if (!conferido.ok) return conferido

    const agora = this.deps.relogio.agora()
    await this.usuarios.atualizar({
      ...usuario,
      senhaHash: await this.hash.gerar(entrada.novaSenha),
      deveTrocarSenha: false,
      // RN-157: quem leu o código nesta caixa provou que o e-mail é dele.
      emailConfirmadoEm: usuario.emailConfirmadoEm ?? agora,
    })
    // Quem tinha a senha antiga perde o acesso: todas as sessões caem.
    await this.sessoes.removerTodasDoUsuario(usuario.id)
    const sessao = await abrirSessao({ sessoes: this.sessoes, tokens: this.deps.tokens, relogio: this.deps.relogio }, usuario.id)
    return ok({ ...sessao, perfil: usuario.perfil })
  }
}

// ── Trocar o e-mail em Meus dados (RF-154, RF-155) ──

export class PedirTrocaDeEmailUseCase {
  constructor(
    private readonly usuarios: UsuarioRepository,
    private readonly deps: DepsDoCodigo,
  ) {}

  async executar(usuarioId: string, emailDigitado: string): Promise<Result<{ enviadoPara: string }>> {
    const usuario = await this.usuarios.buscarPorId(usuarioId)
    if (!usuario) return falha("NAO_ENCONTRADO", "Conta não encontrada.")
    const email = emailDigitado.trim().toLowerCase()
    if (!emailValido(email)) return falhaDeValidacao({ emailNovo: "Informe um e-mail válido." })
    if (email === usuario.email) return falhaDeValidacao({ emailNovo: "Este já é o e-mail da sua conta." })
    if (await this.usuarios.existeEmail(email, usuario.id)) return falhaDeValidacao({ emailNovo: "Este e-mail já é usado por outra conta." })
    return emitirCodigo(this.deps, usuario, "TROCA_DE_EMAIL", email)
  }
}

export class ConfirmarTrocaDeEmailUseCase {
  constructor(
    private readonly usuarios: UsuarioRepository,
    private readonly deps: DepsDoCodigo,
    private readonly segundoPlano: SegundoPlano,
    private readonly enderecos: EnderecosDoSite,
  ) {}

  async executar(usuarioId: string, digitado: string): Promise<Result<{ email: string }>> {
    const usuario = await this.usuarios.buscarPorId(usuarioId)
    if (!usuario) return falha("NAO_ENCONTRADO", "Conta não encontrada.")
    const conferido = await conferirCodigo(this.deps, usuario.id, "TROCA_DE_EMAIL", digitado)
    if (!conferido.ok) return conferido
    const emailNovo = conferido.valor.email
    // Outra conta pode ter ficado com o endereço enquanto o código esperava.
    if (await this.usuarios.existeEmail(emailNovo, usuario.id)) return falhaDeValidacao({ codigo: "Este e-mail passou a ser usado por outra conta." })

    const agora = this.deps.relogio.agora()
    await this.usuarios.atualizar({ ...usuario, email: emailNovo, emailConfirmadoEm: usuario.emailConfirmadoEm ?? agora })
    // RF-155: o endereço antigo fica sabendo, depois da resposta; falha no envio só vai para o log.
    const antigo = { nome: usuario.nome, email: usuario.email }
    this.segundoPlano.executar(async () => {
      const envio = await this.deps.correio.enviar(
        antigo,
        montarAvisoDeEmailTrocado({ nome: usuario.nome, emailNovo, quando: agora, linkDoContato: this.enderecos.contato() }),
      )
      if (!envio.ok) console.warn("[troca de e-mail] aviso ao endereço antigo não enviado", envio.codigo)
    })
    return ok({ email: emailNovo })
  }
}

export class CancelarTrocaDeEmailUseCase {
  constructor(private readonly deps: Pick<DepsDoCodigo, "codigosPorEmail" | "relogio">) {}

  async executar(usuarioId: string): Promise<void> {
    await this.deps.codigosPorEmail.encerrarEmAberto(usuarioId, "TROCA_DE_EMAIL", this.deps.relogio.agora())
  }
}
