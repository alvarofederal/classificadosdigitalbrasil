// APLICAÇÃO — cadastro do anunciante, perfil e troca de senha (RF-01, RF-20, RF-21, RN-01 a RN-04).

import { type Result, falha, falhaDeValidacao, ok } from "@/domain/shared/result"
import { somenteDigitos } from "@/domain/shared/texto"
import { ufDe } from "@/domain/localidade/uf"
import {
  type DadosDeCadastro,
  type DadosPessoais,
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
  ) {}

  async executar(entrada: DadosDeCadastro): Promise<Result<{ token: string; expiraEm: Date }>> {
    const dados = { ...normalizarDadosPessoais(entrada), cpf: somenteDigitos(entrada.cpf) }
    const erros = validarCadastro(dados)
    conferirCidade(this.localidades, dados.uf, dados.cidadeCodigo, erros)
    if (!erros.email && (await this.usuarios.existeEmail(dados.email))) erros.email = "Já existe uma conta com este e-mail. Entre com ela."
    if (!erros.cpf && (await this.usuarios.existeCpf(dados.cpf))) erros.cpf = "Já existe uma conta com este CPF."
    if (Object.keys(erros).length > 0) return falhaDeValidacao(erros)

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
    })
    return ok(await abrirSessao({ sessoes: this.sessoes, tokens: this.tokens, relogio: this.relogio }, usuarioId))
  }
}

export class AtualizarPerfilUseCase {
  constructor(
    private readonly usuarios: UsuarioRepository,
    private readonly localidades: Localidades,
  ) {}

  async executar(usuarioId: string, entrada: DadosPessoais): Promise<Result<true>> {
    const usuario = await this.usuarios.buscarPorId(usuarioId)
    if (!usuario) return falha("NAO_ENCONTRADO", "Conta não encontrada.")
    const dados = normalizarDadosPessoais(entrada)
    const erros = validarDadosPessoais(dados)
    conferirCidade(this.localidades, dados.uf, dados.cidadeCodigo, erros)
    if (!erros.email && (await this.usuarios.existeEmail(dados.email, usuarioId))) erros.email = "Este e-mail já é usado por outra conta."
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
