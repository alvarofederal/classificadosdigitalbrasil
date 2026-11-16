// APLICAÇÃO — cadastro do anunciante, perfil e troca de senha (RF-01, RF-20, RF-21, RN-01 a RN-04; RF-150 da feature 016).

import { type Result, falha, falhaDeValidacao, ok } from "@/domain/shared/result"
import { somenteDigitos } from "@/domain/shared/texto"
import { ufDe } from "@/domain/localidade/uf"
import {
  CADASTROS_POR_CONEXAO,
  type DadosDeCadastro,
  type DadosPessoais,
  JANELA_DOS_CADASTROS_MS,
  normalizarDadosPessoais,
  validarCadastro,
  validarDadosPessoais,
  validarNovaSenha,
} from "@/domain/usuario/usuario"
import type { ErrosDeCampo } from "@/domain/shared/result"
import type { GeradorDeToken, HashDeSenha, SessaoRepository, UsuarioRepository } from "../../ports/acesso"
import type { Localidades } from "../../ports/localidades"
import type { Relogio } from "../../ports/sistema"
import { abrirSessao } from "./autenticar-usuario"
import { type DepsDoCodigo, emitirCodigo } from "./codigo-por-email"

/** RN-04: a cidade escolhida precisa existir no catálogo do IBGE e pertencer à UF. */
export function conferirCidade(localidades: Localidades, uf: string, cidadeCodigo: number, erros: ErrosDeCampo): void {
  if (erros.uf || erros.cidadeCodigo) return
  const cidade = localidades.cidade(cidadeCodigo)
  if (!cidade || cidade.uf !== ufDe(uf)) erros.cidadeCodigo = "Escolha uma cidade do estado selecionado."
}

export class CadastrarAnuncianteUseCase {
  constructor(
    private readonly usuarios: UsuarioRepository,
    private readonly sessoes: SessaoRepository,
    private readonly hash: HashDeSenha,
    private readonly tokens: GeradorDeToken,
    private readonly localidades: Localidades,
    private readonly relogio: Relogio,
    private readonly codigo: DepsDoCodigo,
  ) {}

  /**
   * RF-150: a conta nasce aguardando a confirmação do e-mail, já com a sessão aberta para a tela do código.
   * `codigoEnviado` falso = o envio falhou; a tela oferece mandar de novo (RN-158).
   */
  async executar(entrada: DadosDeCadastro & { ip?: string | null }): Promise<Result<{ token: string; expiraEm: Date; codigoEnviado: boolean }>> {
    const { ip = null, ...cadastro } = entrada
    const dados = { ...normalizarDadosPessoais(cadastro), cpf: somenteDigitos(cadastro.cpf) }
    const erros = validarCadastro(dados)
    conferirCidade(this.localidades, dados.uf, dados.cidadeCodigo, erros)
    if (!erros.email && (await this.usuarios.existeEmail(dados.email))) erros.email = "Já existe uma conta com este e-mail. Entre com ela."
    if (!erros.cpf && (await this.usuarios.existeCpf(dados.cpf))) erros.cpf = "Já existe uma conta com este CPF."
    if (Object.keys(erros).length > 0) return falhaDeValidacao(erros)
    // RN-176 (feature 017): com dois anúncios de presente por conta, a mesma conexão cria no máximo 5 contas por dia.
    if (ip && (await this.usuarios.contarCadastrosDesde(ip, new Date(this.relogio.agora().getTime() - JANELA_DOS_CADASTROS_MS))) >= CADASTROS_POR_CONEXAO) {
      return falha("MUITOS_CADASTROS", "Muitas contas foram criadas desta conexão hoje. Tente de novo amanhã ou fale com a gente pelo contato.")
    }

    const usuarioId = await this.usuarios.inserir({
      nome: dados.nome,
      cpf: dados.cpf,
      email: dados.email,
      celular: dados.celular,
      uf: dados.uf,
      cidadeCodigo: dados.cidadeCodigo,
      senhaHash: await this.hash.gerar(dados.senha),
      perfil: "ANUNCIANTE",
      ativo: true,
      deveTrocarSenha: false,
      aceitouTermosEm: this.relogio.agora(),
      emailConfirmadoEm: null,
    }, ip)
    const envio = await emitirCodigo(this.codigo, { id: usuarioId, nome: dados.nome }, "CADASTRO", dados.email)
    const sessao = await abrirSessao({ sessoes: this.sessoes, tokens: this.tokens, relogio: this.relogio }, usuarioId)
    return ok({ ...sessao, codigoEnviado: envio.ok })
  }
}

export class AtualizarPerfilUseCase {
  constructor(
    private readonly usuarios: UsuarioRepository,
    private readonly localidades: Localidades,
  ) {}

  /** RF-20. O e-mail não muda aqui: a troca passa pelo código (RF-154, `PedirTrocaDeEmailUseCase`). */
  async executar(usuarioId: string, entrada: Omit<DadosPessoais, "email">): Promise<Result<true>> {
    const usuario = await this.usuarios.buscarPorId(usuarioId)
    if (!usuario) return falha("NAO_ENCONTRADO", "Conta não encontrada.")
    const dados = normalizarDadosPessoais({ ...entrada, email: usuario.email })
    const erros = validarDadosPessoais(dados)
    conferirCidade(this.localidades, dados.uf, dados.cidadeCodigo, erros)
    if (Object.keys(erros).length > 0) return falhaDeValidacao(erros)

    await this.usuarios.atualizar({ ...usuario, ...dados })
    return ok(true)
  }
}

export class AlterarSenhaUseCase {
  constructor(
    private readonly usuarios: UsuarioRepository,
    private readonly sessoes: SessaoRepository,
    private readonly hash: HashDeSenha,
    private readonly tokens: GeradorDeToken,
  ) {}

  /** Troca a senha e derruba as outras sessões da conta (mantém a atual). */
  async executar(entrada: { usuarioId: string; senhaAtual: string; novaSenha: string; confirmacaoSenha: string; tokenAtual?: string }): Promise<Result<true>> {
    const usuario = await this.usuarios.buscarPorId(entrada.usuarioId)
    if (!usuario) return falha("NAO_ENCONTRADO", "Conta não encontrada.")
    if (!(await this.hash.comparar(entrada.senhaAtual, usuario.senhaHash))) {
      return falhaDeValidacao({ senhaAtual: "Senha atual incorreta." })
    }
    const erros = validarNovaSenha(entrada.novaSenha, entrada.confirmacaoSenha, {}, "novaSenha")
    if (!erros.novaSenha && entrada.novaSenha === entrada.senhaAtual) erros.novaSenha = "A nova senha precisa ser diferente da atual."
    if (Object.keys(erros).length > 0) return falhaDeValidacao(erros)

    await this.usuarios.atualizar({ ...usuario, senhaHash: await this.hash.gerar(entrada.novaSenha), deveTrocarSenha: false })
    await this.sessoes.removerTodasDoUsuario(usuario.id, entrada.tokenAtual ? this.tokens.hash(entrada.tokenAtual) : undefined)
    return ok(true)
  }
}
