// APLICAÇÃO — cadastro sem confirmação: continuar ou desistir (feature 024: RF-240 a RF-246, RN-240 a RN-247; ADR-25).
// O Álvaro manda o e-mail pelo Painel; a pessoa continua (confirma a conta) ou desiste (apaga); sem resposta, a rodada diária apaga.

import { type Result, falha, ok } from "@/domain/shared/result"
import { primeiroNome } from "@/domain/shared/carta"
import {
  criadasAteParaContato,
  esperaContato,
  limiteSemResposta,
  montarCartaContinuarOuDesistir,
  prazoParaApagar,
} from "@/domain/usuario/cadastro-sem-confirmacao"
import type { CadastroSemConfirmacao, CadastroSemConfirmacaoRepository, GeradorDeToken, UsuarioRepository } from "../../ports/acesso"
import type { PresenteDeBoasVindas } from "../../ports/banco"
import type { Correio, EnderecosDoSite } from "../../ports/correio"
import type { Relogio } from "../../ports/sistema"

const SEM_ENVIO = "Não foi possível mandar o e-mail agora. Tente de novo em alguns minutos."
export const LINK_SEM_VALOR = "Este link não vale mais. Ele pode ter sido trocado por um e-mail mais novo, ou a conta já foi apagada."

// ── O botão do Álvaro (RF-240, RF-246) ──

export class MandarContinuarOuDesistirUseCase {
  constructor(
    private readonly cadastros: CadastroSemConfirmacaoRepository,
    private readonly correio: Correio,
    private readonly tokens: GeradorDeToken,
    private readonly relogio: Relogio,
    private readonly enderecos: EnderecosDoSite,
  ) {}

  /** Manda (ou manda de novo) o e-mail; devolve até quando a pessoa pode responder (RN-245). */
  async executar(usuarioId: string): Promise<Result<{ prazo: Date }>> {
    const cadastro = await this.cadastros.buscarPorId(usuarioId)
    if (!cadastro) return falha("NAO_ENCONTRADO", "Conta não encontrada.")
    if (cadastro.perfil !== "ANUNCIANTE") return falha("NAO_SE_APLICA", "Só contas de anunciante recebem este e-mail.")
    if (cadastro.emailConfirmado) return falha("JA_CONFIRMADO", "Esta conta já confirmou o e-mail.")
    // RN-247: sem servidor de e-mail, nada sai e nada fica registrado.
    if (!this.correio.ligado) return falha("SEM_CORREIO", SEM_ENVIO)

    const agora = this.relogio.agora()
    const codigo = this.tokens.novoToken()
    const prazo = prazoParaApagar(agora)
    const carta = montarCartaContinuarOuDesistir({
      nome: cadastro.nome,
      criadoEm: cadastro.criadoEm,
      prazo,
      linkContinuar: this.enderecos.continuarCadastro(codigo, "continuar"),
      linkDesistir: this.enderecos.continuarCadastro(codigo, "desistir"),
    })
    const envio = await this.correio.enviar({ nome: cadastro.nome, email: cadastro.email }, carta)
    if (!envio.ok) {
      // No log, só o motivo: o endereço e o link não aparecem.
      console.error("[continuar ou desistir] não enviado", envio.codigo, envio.mensagem)
      return falha("ENVIO_FALHOU", SEM_ENVIO)
    }
    // Grava depois do envio: se o envio falha, o contato anterior (se houver) continua valendo (RN-247).
    // RN-241: só o hash do código fica no banco, e ele troca o anterior.
    await this.cadastros.registrarContato(cadastro.id, this.tokens.hash(codigo), agora)
    return ok({ prazo })
  }
}

// ── O lembrete do Álvaro (RF-244, RF-245) ──

export interface CadastroNoLembrete extends CadastroSemConfirmacao {
  /** RN-240: ainda falta o Álvaro mandar o e-mail. */
  esperaContato: boolean
  /** RN-245: data em que a conta será apagada, se o e-mail já saiu. */
  apagaEm: Date | null
}

export class LembreteDeCadastrosUseCase {
  constructor(
    private readonly cadastros: CadastroSemConfirmacaoRepository,
    private readonly relogio: Relogio,
  ) {}

  /** O número do menu do Painel e do alto do site (RF-245). */
  async contar(): Promise<number> {
    return this.cadastros.contarEsperandoContato(criadasAteParaContato(this.relogio.agora()))
  }

  /** O quadro do Resumo (RF-244): quem espera contato primeiro, depois quem aguarda resposta, pelo prazo. */
  async listar(limite = 50): Promise<CadastroNoLembrete[]> {
    const agora = this.relogio.agora()
    const itens = (await this.cadastros.listar(limite)).map((c) => ({
      ...c,
      esperaContato: esperaContato(c, agora),
      apagaEm: c.contatoEnviadoEm ? prazoParaApagar(c.contatoEnviadoEm) : null,
    }))
    return itens.filter((c) => c.esperaContato || c.apagaEm)
  }
}

// ── A página do link (RF-241, RF-242, RN-242) ──

export type CadastroDoLink = { situacao: "PENDENTE"; primeiroNome: string; criadoEm: Date; apagaEm: Date } | { situacao: "CONFIRMADO" }

export class ContinuarOuDesistirUseCase {
  constructor(
    private readonly cadastros: CadastroSemConfirmacaoRepository,
    private readonly usuarios: UsuarioRepository,
    private readonly tokens: GeradorDeToken,
    private readonly relogio: Relogio,
    /** Feature 017 (RN-174): continuar confirma a conta, e o presente sai como na confirmação pelo código. */
    private readonly presente?: PresenteDeBoasVindas,
  ) {}

  private async daConta(codigo: string): Promise<CadastroSemConfirmacao | null> {
    if (!codigo || codigo.length > 100) return null
    const cadastro = await this.cadastros.buscarPeloHash(this.tokens.hash(codigo))
    return cadastro && cadastro.perfil === "ANUNCIANTE" && cadastro.contatoEnviadoEm ? cadastro : null
  }

  /** Só mostra: abrir o link não muda nada (RN-242). Null = link sem valor. */
  async ver(codigo: string): Promise<CadastroDoLink | null> {
    const cadastro = await this.daConta(codigo)
    if (!cadastro) return null
    if (cadastro.emailConfirmado) return { situacao: "CONFIRMADO" }
    return { situacao: "PENDENTE", primeiroNome: primeiroNome(cadastro.nome), criadoEm: cadastro.criadoEm, apagaEm: prazoParaApagar(cadastro.contatoEnviadoEm!) }
  }

  /** RF-241: confirma o e-mail (o link prova, como o código, que a pessoa lê aquela caixa) e dá o presente. */
  async continuar(codigo: string): Promise<Result<true>> {
    const cadastro = await this.daConta(codigo)
    if (!cadastro) return falha("LINK_SEM_VALOR", LINK_SEM_VALOR)
    if (!cadastro.emailConfirmado) {
      const usuario = await this.usuarios.buscarPorId(cadastro.id)
      if (!usuario) return falha("LINK_SEM_VALOR", LINK_SEM_VALOR)
      // O link foi para o e-mail atual da conta: corrigir o e-mail limpa o contato (RN-246), e o link antigo já não acha a conta.
      await this.usuarios.atualizar({ ...usuario, emailConfirmadoEm: this.relogio.agora() })
      await this.presente?.dar(usuario.id)
    }
    await this.cadastros.limparContato(cadastro.id)
    return ok(true)
  }

  /** RF-242: apaga a conta na hora, com as condições da RN-243. */
  async desistir(codigo: string): Promise<Result<true>> {
    const cadastro = await this.daConta(codigo)
    if (!cadastro) return falha("LINK_SEM_VALOR", LINK_SEM_VALOR)
    if (cadastro.emailConfirmado) {
      return falha("JA_CONFIRMADO", "Esta conta já está confirmada e não pode ser apagada por este link. Para apagar, fale com a gente pela página Como funciona.")
    }
    if (!(await this.cadastros.apagar(cadastro.id))) {
      return falha("NAO_APAGADA", "Não foi possível apagar esta conta por aqui. Fale com a gente pela página Como funciona.")
    }
    return ok(true)
  }
}

// ── A rodada diária (RF-243) ──

export class ApagarCadastrosSemRespostaUseCase {
  constructor(
    private readonly cadastros: CadastroSemConfirmacaoRepository,
    private readonly relogio: Relogio,
  ) {}

  async executar(): Promise<{ apagados: number }> {
    const ids = await this.cadastros.semRespostaDesde(limiteSemResposta(this.relogio.agora()))
    let apagados = 0
    // RN-243: cada um é apagado com as condições na mesma instrução; quem confirmou no meio tempo fica.
    for (const id of ids) if (await this.cadastros.apagar(id)) apagados++
    return { apagados }
  }
}
