// Feature 016: código por e-mail (RF-150 a RF-155, RN-150 a RN-159). Endereços inventados para o teste.
import { describe, expect, it } from "vitest"
import type { UsuarioRegistro } from "@/application/ports/acesso"
import {
  CancelarTrocaDeEmailUseCase,
  ConfirmarEmailUseCase,
  ConfirmarTrocaDeEmailUseCase,
  CorrigirEmailDoCadastroUseCase,
  CriarNovaSenhaUseCase,
  PedirNovaSenhaUseCase,
  PedirTrocaDeEmailUseCase,
  RESPOSTA_DO_ESQUECI_A_SENHA,
  ReenviarCodigoDoCadastroUseCase,
  emitirCodigo,
} from "@/application/use-cases/acesso/codigo-por-email"
import { AtualizarPerfilUseCase } from "@/application/use-cases/acesso/conta"
import {
  codigoNoFormato,
  emailCanonico,
  mascararEmail,
  montarAvisoDeEmailTrocado,
  montarCartaDoCodigo,
  normalizarCodigo,
  segundosParaOutroCodigo,
} from "@/domain/usuario/codigo-por-email"
import { cartaEmHtml, cartaEmTexto } from "@/infrastructure/email/modelo"
import {
  CodigosDoTeste,
  CodigosPorEmailEmMemoria,
  CorreioFalso,
  RelogioFixo,
  SegundoPlanoManual,
  SessoesEmMemoria,
  UsuariosEmMemoria,
  enderecosDeTeste,
  hashFalso,
  localidades,
  tokensFalsos,
} from "../fakes"

const MINUTO = 60_000
const BRASILIA = 5300108

function montar() {
  const relogio = new RelogioFixo()
  const usuarios = new UsuariosEmMemoria()
  const sessoes = new SessoesEmMemoria()
  const correio = new CorreioFalso()
  const codigosPorEmail = new CodigosPorEmailEmMemoria()
  const codigos = new CodigosDoTeste()
  const segundoPlano = new SegundoPlanoManual()
  const deps = { codigosPorEmail, correio, codigos, tokens: tokensFalsos, relogio }

  function conta(dados: Partial<UsuarioRegistro> = {}): UsuarioRegistro {
    const u: UsuarioRegistro = {
      id: `u-${usuarios.itens.size + 1}`,
      nome: "Maria Souza",
      cpf: "52998224725",
      email: "maria@exemplo.com",
      celular: "61999998888",
      uf: "DF",
      cidadeCodigo: BRASILIA,
      senhaHash: "hash:senha-antiga",
      perfil: "ANUNCIANTE",
      ativo: true,
      deveTrocarSenha: false,
      aceitouTermosEm: relogio.agora(),
      emailConfirmadoEm: null,
      ...dados,
    }
    usuarios.itens.set(u.id, u)
    return u
  }

  return {
    relogio,
    usuarios,
    sessoes,
    correio,
    codigosPorEmail,
    codigos,
    segundoPlano,
    deps,
    conta,
    /** O último código que "chegou" no e-mail. */
    ultimoCodigo: () => correio.enviadas.at(-1)?.carta.destaque ?? "",
    confirmar: new ConfirmarEmailUseCase(usuarios, deps),
    reenviar: new ReenviarCodigoDoCadastroUseCase(usuarios, deps),
    corrigir: new CorrigirEmailDoCadastroUseCase(usuarios, deps),
    pedirNovaSenha: new PedirNovaSenhaUseCase(usuarios, deps, segundoPlano),
    criarNovaSenha: new CriarNovaSenhaUseCase(usuarios, sessoes, hashFalso, deps),
    pedirTroca: new PedirTrocaDeEmailUseCase(usuarios, deps),
    confirmarTroca: new ConfirmarTrocaDeEmailUseCase(usuarios, deps, segundoPlano, enderecosDeTeste),
    cancelarTroca: new CancelarTrocaDeEmailUseCase(deps),
    atualizarPerfil: new AtualizarPerfilUseCase(usuarios, localidades),
  }
}

describe("Código por e-mail: regras do domínio (RN-150, RN-152, RN-155, RN-159)", () => {
  it("RN-155: o que vem depois do + não conta, e no Gmail os pontos também não", () => {
    expect(emailCanonico(" Fulano+classificados@Gmail.com ")).toBe("fulano@gmail.com")
    expect(emailCanonico("f.u.lano@gmail.com")).toBe("fulano@gmail.com")
    expect(emailCanonico("f.ulano+x@googlemail.com")).toBe("fulano@gmail.com")
    expect(emailCanonico("maria.souza+loja@exemplo.com.br")).toBe("maria.souza@exemplo.com.br")
    expect(emailCanonico("+so-etiqueta@exemplo.com")).toBe("+so-etiqueta@exemplo.com")
  })

  it("RN-150: o código digitado vale com espaço ou traço, e precisa de 6 números", () => {
    expect(normalizarCodigo(" 482 913 ")).toBe("482913")
    expect(normalizarCodigo("482-913")).toBe("482913")
    expect(codigoNoFormato("482913")).toBe(true)
    expect(codigoNoFormato("48291")).toBe(false)
    expect(codigoNoFormato("4829134")).toBe(false)
  })

  it("RN-152: conta os segundos que faltam para pedir outro código", () => {
    const agora = new Date("2026-11-15T12:00:00Z")
    expect(segundosParaOutroCodigo(null, agora)).toBe(0)
    expect(segundosParaOutroCodigo(new Date(agora.getTime() - 15_000), agora)).toBe(45)
    expect(segundosParaOutroCodigo(new Date(agora.getTime() - 60_000), agora)).toBe(0)
  })

  it("RN-159: a carta leva só o primeiro nome, o código em destaque e o lembrete de não passar o código", () => {
    const carta = montarCartaDoCodigo({ nome: "Maria Souza Lima", codigo: "482913", finalidade: "CADASTRO" })
    expect(carta.saudacao).toBe("Olá, Maria.")
    expect(carta.assunto).toBe("Código para confirmar seu e-mail: 482913")
    expect(carta.destaque).toBe("482913")
    expect(carta.paragrafos.join(" ")).toContain("15 minutos")
    expect(carta.observacoes.join(" ")).toContain("nunca pede este código")
    expect(cartaEmHtml(carta)).toContain("482913")
    expect(cartaEmTexto(carta)).toContain("482913")
    expect(JSON.stringify(carta)).not.toContain("Souza")
  })

  it("RF-155: o aviso ao e-mail antigo mostra o novo mascarado, a data de Brasília e o contato", () => {
    expect(mascararEmail("fulano@exemplo.com")).toBe("fu***@exemplo.com")
    const carta = montarAvisoDeEmailTrocado({
      nome: "Maria Souza",
      emailNovo: "novo.endereco@exemplo.com",
      quando: new Date("2026-11-15T23:40:00Z"),
      linkDoContato: enderecosDeTeste.contato(),
    })
    expect(carta.paragrafos[0]).toContain("no***@exemplo.com")
    expect(carta.paragrafos[0]).toContain("15/11/2026, às 20:40")
    expect(carta.paragrafos[0]).not.toContain("novo.endereco")
    expect(carta.observacoes[0]).toContain("como-funciona#contato")
  })
})

describe("Confirmar o cadastro (RF-150 a RF-152, RN-150 a RN-153, RN-158)", () => {
  it("RF-150: o código certo confirma o e-mail, e o banco guarda só o hash", async () => {
    const t = montar()
    const u = t.conta()
    t.codigos.proximos = ["482913"]
    expect((await emitirCodigo(t.deps, u, "CADASTRO", u.email)).ok).toBe(true)
    expect(t.codigosPorEmail.itens[0].codigoHash).toBe(tokensFalsos.hash("482913"))
    expect(JSON.stringify(t.codigosPorEmail.itens)).not.toContain('"482913"')

    const r = await t.confirmar.executar(u.id, "482 913")
    expect(r.ok).toBe(true)
    expect(t.usuarios.itens.get(u.id)?.emailConfirmadoEm).toEqual(t.relogio.agora())
    // RN-153: o mesmo código não serve duas vezes.
    expect(t.codigosPorEmail.itens[0].encerradoEm).not.toBeNull()
  })

  it("RN-151: cinco erros bloqueiam o código, mesmo que depois venha o certo", async () => {
    const t = montar()
    const u = t.conta()
    t.codigos.proximos = ["482913"]
    await emitirCodigo(t.deps, u, "CADASTRO", u.email)
    const primeira = await t.confirmar.executar(u.id, "000000")
    expect(!primeira.ok && primeira.campos?.codigo).toBe("Código incorreto. Restam 4 tentativas.")
    for (let i = 0; i < 3; i++) await t.confirmar.executar(u.id, "000000")
    const quinta = await t.confirmar.executar(u.id, "000000")
    expect(!quinta.ok && quinta.campos?.codigo).toBe("Código incorreto. Peça outro código.")
    const certo = await t.confirmar.executar(u.id, "482913")
    expect(!certo.ok && certo.campos?.codigo).toBe("Muitas tentativas erradas. Peça outro código.")
    expect(t.usuarios.itens.get(u.id)?.emailConfirmadoEm).toBeNull()
  })

  it("RN-150: depois de 15 minutos o código venceu", async () => {
    const t = montar()
    const u = t.conta()
    t.codigos.proximos = ["482913"]
    await emitirCodigo(t.deps, u, "CADASTRO", u.email)
    t.relogio.instante = new Date(t.relogio.agora().getTime() + 15 * MINUTO)
    const r = await t.confirmar.executar(u.id, "482913")
    expect(!r.ok && r.campos?.codigo).toBe("Este código venceu. Peça outro.")
  })

  it("formato errado não gasta tentativa", async () => {
    const t = montar()
    const u = t.conta()
    await emitirCodigo(t.deps, u, "CADASTRO", u.email)
    const r = await t.confirmar.executar(u.id, "12a")
    expect(!r.ok && r.campos?.codigo).toBe("Digite os 6 números do código.")
    expect(t.codigosPorEmail.itens[0].tentativas).toBe(0)
  })

  it("RN-152: outro código só depois de 60 segundos e no máximo 5 por hora; o novo invalida o anterior", async () => {
    const t = montar()
    const u = t.conta()
    t.codigos.proximos = ["111111", "222222"]
    await emitirCodigo(t.deps, u, "CADASTRO", u.email)
    t.relogio.instante = new Date(t.relogio.agora().getTime() + 20_000)
    const cedo = await t.reenviar.executar(u.id)
    expect(!cedo.ok && cedo.mensagem).toBe("Aguarde 40 segundos para pedir outro código.")

    t.relogio.instante = new Date(t.relogio.agora().getTime() + 40_000)
    expect((await t.reenviar.executar(u.id)).ok).toBe(true)
    const antigo = await t.confirmar.executar(u.id, "111111")
    expect(!antigo.ok && antigo.campos?.codigo).toBe("Código incorreto. Restam 4 tentativas.")

    for (let i = 0; i < 3; i++) {
      t.relogio.instante = new Date(t.relogio.agora().getTime() + MINUTO)
      expect((await t.reenviar.executar(u.id)).ok).toBe(true)
    }
    t.relogio.instante = new Date(t.relogio.agora().getTime() + MINUTO)
    const sexto = await t.reenviar.executar(u.id)
    expect(!sexto.ok && sexto.codigo).toBe("LIMITE_DE_CODIGOS")
    expect(t.correio.enviadas).toHaveLength(5)
  })

  it("RN-158: sem servidor de e-mail o código não sai e nada fica registrado; envio que falha avisa", async () => {
    const t = montar()
    const u = t.conta()
    t.correio.ligado = false
    const desligado = await emitirCodigo(t.deps, u, "CADASTRO", u.email)
    expect(!desligado.ok && desligado.codigo).toBe("SEM_CORREIO")
    expect(t.codigosPorEmail.itens).toHaveLength(0)

    t.correio.ligado = true
    t.correio.falhar = true
    const falhou = await emitirCodigo(t.deps, u, "CADASTRO", u.email)
    expect(!falhou.ok && falhou.codigo).toBe("ENVIO_FALHOU")
  })

  it("RF-152: corrige o e-mail antes de confirmar; o código vai para o novo e o do antigo deixa de valer", async () => {
    const t = montar()
    const u = t.conta({ email: "maria@exemplo.com.br" })
    t.codigos.proximos = ["111111", "222222"]
    await emitirCodigo(t.deps, u, "CADASTRO", u.email)
    t.relogio.instante = new Date(t.relogio.agora().getTime() + MINUTO)

    const r = await t.corrigir.executar(u.id, " Maria@Exemplo.com ")
    expect(r.ok && r.valor.enviadoPara).toBe("maria@exemplo.com")
    expect(t.usuarios.itens.get(u.id)?.email).toBe("maria@exemplo.com")
    expect(t.correio.enviadas.at(-1)?.para.email).toBe("maria@exemplo.com")
    expect((await t.confirmar.executar(u.id, "111111")).ok).toBe(false)
    expect((await t.confirmar.executar(u.id, "222222")).ok).toBe(true)
  })

  it("RN-155: não corrige para um e-mail que já é de outra conta, nem escrito de outro jeito", async () => {
    const t = montar()
    t.conta({ id: "outra", email: "fulano@gmail.com", cpf: "11144477735" })
    const u = t.conta({ email: "maria@exemplo.com" })
    const r = await t.corrigir.executar(u.id, "F.ulano+anuncios@gmail.com")
    expect(!r.ok && r.campos?.email).toBe("Já existe uma conta com este e-mail.")
  })

  it("conta já confirmada não pede código nem corrige e-mail por aqui", async () => {
    const t = montar()
    const u = t.conta({ emailConfirmadoEm: new Date("2026-11-01T12:00:00Z") })
    expect((await t.confirmar.executar(u.id, "000000")).ok).toBe(true)
    const reenviar = await t.reenviar.executar(u.id)
    expect(!reenviar.ok && reenviar.codigo).toBe("JA_CONFIRMADO")
    const corrigir = await t.corrigir.executar(u.id, "outra@exemplo.com")
    expect(!corrigir.ok && corrigir.codigo).toBe("JA_CONFIRMADO")
  })
})

describe("Esqueci a senha (RF-153, RN-156, RN-157)", () => {
  it("RN-156: a resposta é a mesma exista ou não a conta, e o código só sai para conta ativa", async () => {
    const t = montar()
    t.conta({ emailConfirmadoEm: t.relogio.agora() })
    t.conta({ id: "desativada", email: "desativada@exemplo.com", cpf: "11144477735", ativo: false })

    const existe = await t.pedirNovaSenha.executar("Maria@Exemplo.com")
    const naoExiste = await t.pedirNovaSenha.executar("ninguem@exemplo.com")
    const desativada = await t.pedirNovaSenha.executar("desativada@exemplo.com")
    expect(existe).toEqual({ ok: true, valor: RESPOSTA_DO_ESQUECI_A_SENHA })
    expect(naoExiste).toEqual(existe)
    expect(desativada).toEqual(existe)

    // O envio sai depois da resposta, só para a conta ativa.
    expect(t.correio.enviadas).toHaveLength(0)
    await t.segundoPlano.concluir()
    expect(t.correio.enviadas.map((e) => e.para.email)).toEqual(["maria@exemplo.com"])
    expect(t.correio.enviadas[0].carta.assunto).toContain("senha nova")
  })

  it("RF-153: com o código, troca a senha, derruba as outras sessões e entra logado", async () => {
    const t = montar()
    const u = t.conta({ emailConfirmadoEm: t.relogio.agora() })
    await t.sessoes.criar({ usuarioId: u.id, tokenHash: "sessao-antiga", expiraEm: new Date("2026-12-01T00:00:00Z") })
    t.codigos.proximos = ["654321"]
    await t.pedirNovaSenha.executar(u.email)
    await t.segundoPlano.concluir()

    const r = await t.criarNovaSenha.executar({ email: u.email, codigo: t.ultimoCodigo(), novaSenha: "senha-nova-1", confirmacaoSenha: "senha-nova-1" })
    expect(r.ok).toBe(true)
    expect(t.usuarios.itens.get(u.id)?.senhaHash).toBe("hash:senha-nova-1")
    expect(t.sessoes.itens.map((s) => s.tokenHash)).not.toContain("sessao-antiga")
    expect(t.sessoes.itens).toHaveLength(1)
  })

  it("RN-157: criar a senha nova pelo código também confirma o e-mail", async () => {
    const t = montar()
    const u = t.conta()
    t.codigos.proximos = ["654321"]
    await t.pedirNovaSenha.executar(u.email)
    await t.segundoPlano.concluir()
    await t.criarNovaSenha.executar({ email: u.email, codigo: "654321", novaSenha: "senha-nova-1", confirmacaoSenha: "senha-nova-1" })
    expect(t.usuarios.itens.get(u.id)?.emailConfirmadoEm).toEqual(t.relogio.agora())
  })

  it("RN-156: e-mail sem conta recebe a mesma resposta de código errado; senha curta é recusada antes", async () => {
    const t = montar()
    const semConta = await t.criarNovaSenha.executar({ email: "ninguem@exemplo.com", codigo: "123456", novaSenha: "senha-nova-1", confirmacaoSenha: "senha-nova-1" })
    expect(!semConta.ok && semConta.campos?.codigo).toBe("Código incorreto ou vencido. Peça outro.")
    const curta = await t.criarNovaSenha.executar({ email: "ninguem@exemplo.com", codigo: "123456", novaSenha: "curta", confirmacaoSenha: "curta" })
    expect(!curta.ok && curta.campos?.novaSenha).toBeTruthy()
  })

  it("o código do cadastro não serve para criar senha nova (RN-153)", async () => {
    const t = montar()
    const u = t.conta()
    t.codigos.proximos = ["482913"]
    await emitirCodigo(t.deps, u, "CADASTRO", u.email)
    const r = await t.criarNovaSenha.executar({ email: u.email, codigo: "482913", novaSenha: "senha-nova-1", confirmacaoSenha: "senha-nova-1" })
    expect(!r.ok && r.campos?.codigo).toBe("Peça um código novo.")
  })
})

describe("Trocar o e-mail em Meus dados (RF-154, RF-155)", () => {
  it("RF-154: o e-mail só muda depois do código mandado para o novo; o antigo recebe o aviso", async () => {
    const t = montar()
    const u = t.conta({ emailConfirmadoEm: new Date("2026-11-01T12:00:00Z") })
    t.codigos.proximos = ["777888"]

    const pedido = await t.pedirTroca.executar(u.id, "Maria.Nova@Exemplo.com")
    expect(pedido.ok && pedido.valor.enviadoPara).toBe("maria.nova@exemplo.com")
    expect(t.usuarios.itens.get(u.id)?.email).toBe("maria@exemplo.com")
    expect(t.correio.enviadas[0].para.email).toBe("maria.nova@exemplo.com")
    expect(t.correio.enviadas[0].carta.assunto).toContain("e-mail novo")

    const r = await t.confirmarTroca.executar(u.id, "777888")
    expect(r.ok && r.valor.email).toBe("maria.nova@exemplo.com")
    expect(t.usuarios.itens.get(u.id)?.email).toBe("maria.nova@exemplo.com")

    // RF-155: depois da resposta, o endereço antigo fica sabendo.
    await t.segundoPlano.concluir()
    const aviso = t.correio.enviadas.at(-1)!
    expect(aviso.para.email).toBe("maria@exemplo.com")
    expect(aviso.carta.assunto).toBe("O e-mail da sua conta foi trocado")
  })

  it("recusa e-mail inválido, o mesmo de agora e o de outra conta (RN-155)", async () => {
    const t = montar()
    t.conta({ id: "outra", email: "fulano@gmail.com", cpf: "11144477735" })
    const u = t.conta({ emailConfirmadoEm: t.relogio.agora() })
    const invalido = await t.pedirTroca.executar(u.id, "sem-arroba")
    expect(!invalido.ok && invalido.campos?.emailNovo).toBe("Informe um e-mail válido.")
    const mesmo = await t.pedirTroca.executar(u.id, "MARIA@exemplo.com")
    expect(!mesmo.ok && mesmo.campos?.emailNovo).toBe("Este já é o e-mail da sua conta.")
    const deOutro = await t.pedirTroca.executar(u.id, "fu.lano@gmail.com")
    expect(!deOutro.ok && deOutro.campos?.emailNovo).toBe("Este e-mail já é usado por outra conta.")
  })

  it("se outra conta ficou com o endereço enquanto o código esperava, a troca não acontece", async () => {
    const t = montar()
    const u = t.conta({ emailConfirmadoEm: t.relogio.agora() })
    t.codigos.proximos = ["777888"]
    await t.pedirTroca.executar(u.id, "disputado@exemplo.com")
    t.conta({ id: "rapida", email: "disputado@exemplo.com", cpf: "11144477735" })
    const r = await t.confirmarTroca.executar(u.id, "777888")
    expect(!r.ok && r.campos?.codigo).toBe("Este e-mail passou a ser usado por outra conta.")
    expect(t.usuarios.itens.get(u.id)?.email).toBe("maria@exemplo.com")
  })

  it("cancelar a troca invalida o código", async () => {
    const t = montar()
    const u = t.conta({ emailConfirmadoEm: t.relogio.agora() })
    t.codigos.proximos = ["777888"]
    await t.pedirTroca.executar(u.id, "maria.nova@exemplo.com")
    await t.cancelarTroca.executar(u.id)
    const r = await t.confirmarTroca.executar(u.id, "777888")
    expect(!r.ok && r.campos?.codigo).toBe("Peça um código novo.")
  })

  it("RF-20: salvar os dados pessoais não muda o e-mail", async () => {
    const t = montar()
    const u = t.conta({ emailConfirmadoEm: t.relogio.agora() })
    const r = await t.atualizarPerfil.executar(u.id, { nome: "Maria Souza Lima", celular: "(61) 98888-7777", uf: "DF", cidadeCodigo: BRASILIA })
    expect(r.ok).toBe(true)
    expect(t.usuarios.itens.get(u.id)).toMatchObject({ nome: "Maria Souza Lima", celular: "61988887777", email: "maria@exemplo.com" })
  })
})
