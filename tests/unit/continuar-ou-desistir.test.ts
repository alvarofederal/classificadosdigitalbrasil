// Feature 024: cadastro sem confirmação, continuar ou desistir (RF-240 a RF-246, RN-240 a RN-248). Endereços inventados para o teste.
import { describe, expect, it } from "vitest"
import type { UsuarioRegistro } from "@/application/ports/acesso"
import {
  ApagarCadastrosSemRespostaUseCase,
  ContinuarOuDesistirUseCase,
  LINK_SEM_VALOR,
  LembreteDeCadastrosUseCase,
  MandarContinuarOuDesistirUseCase,
} from "@/application/use-cases/acesso/cadastro-sem-confirmacao"
import { CorrigirEmailDoCadastroUseCase } from "@/application/use-cases/acesso/codigo-por-email"
import {
  DIAS_PARA_RESPONDER,
  ESPERA_ANTES_DO_CONTATO_MS,
  escolhaDoEndereco,
  esperaContato,
  montarCartaContinuarOuDesistir,
  prazoParaApagar,
} from "@/domain/usuario/cadastro-sem-confirmacao"
import { cartaEmHtml, cartaEmTexto } from "@/infrastructure/email/modelo"
import {
  CadastrosSemConfirmacaoEmMemoria,
  CodigosDoTeste,
  CodigosPorEmailEmMemoria,
  CorreioFalso,
  RelogioFixo,
  UsuariosEmMemoria,
  enderecosDeTeste,
  tokensFalsos,
} from "../fakes"

const HORA = 3_600_000
const DIA = 86_400_000

function montar() {
  const relogio = new RelogioFixo(new Date("2026-11-20T15:00:00Z"))
  const usuarios = new UsuariosEmMemoria()
  const cadastros = new CadastrosSemConfirmacaoEmMemoria(usuarios)
  const correio = new CorreioFalso()
  const presentes: string[] = []
  const presente = { dar: async (id: string) => (presentes.push(id), true) }

  /** Conta criada `horasAtras` horas antes de agora. */
  function conta(dados: Partial<UsuarioRegistro> = {}, horasAtras = 2): UsuarioRegistro {
    const u: UsuarioRegistro = {
      id: `u-${usuarios.itens.size + 1}`,
      nome: "Maria Souza",
      cpf: "52998224725",
      email: `maria${usuarios.itens.size + 1}@exemplo.com`,
      celular: "61999998888",
      uf: "DF",
      cidadeCodigo: 5300108,
      senhaHash: "hash:senha",
      perfil: "ANUNCIANTE",
      ativo: true,
      deveTrocarSenha: false,
      aceitouTermosEm: relogio.agora(),
      emailConfirmadoEm: null,
      ...dados,
    }
    usuarios.itens.set(u.id, u)
    usuarios.criadosEm.set(u.id, new Date(relogio.agora().getTime() - horasAtras * HORA))
    return u
  }

  const mandar = new MandarContinuarOuDesistirUseCase(cadastros, correio, tokensFalsos, relogio, enderecosDeTeste)
  const lembrete = new LembreteDeCadastrosUseCase(cadastros, relogio)
  const responder = new ContinuarOuDesistirUseCase(cadastros, usuarios, tokensFalsos, relogio, presente)
  const rodada = new ApagarCadastrosSemRespostaUseCase(cadastros, relogio)

  /** O código do link que saiu no último e-mail. */
  function codigoDoUltimoEmail(): string {
    const url = correio.enviadas.at(-1)!.carta.botao!.url
    return decodeURIComponent(url.split("/continuar-cadastro/")[1]!.split("?")[0]!)
  }

  return { relogio, usuarios, cadastros, correio, presentes, conta, mandar, lembrete, responder, rodada, codigoDoUltimoEmail }
}

describe("Domínio (feature 024)", () => {
  it("RN-240: espera contato só depois de 1 hora e enquanto o e-mail não saiu", () => {
    const agora = new Date("2026-11-20T15:00:00Z")
    expect(ESPERA_ANTES_DO_CONTATO_MS).toBe(HORA)
    expect(esperaContato({ criadoEm: new Date(agora.getTime() - 30 * 60_000), contatoEnviadoEm: null }, agora)).toBe(false)
    expect(esperaContato({ criadoEm: new Date(agora.getTime() - HORA), contatoEnviadoEm: null }, agora)).toBe(true)
    expect(esperaContato({ criadoEm: new Date(agora.getTime() - 5 * HORA), contatoEnviadoEm: agora }, agora)).toBe(false)
  })

  it("RN-245: o prazo é de 7 dias depois do e-mail", () => {
    expect(DIAS_PARA_RESPONDER).toBe(7)
    expect(prazoParaApagar(new Date("2026-11-20T15:00:00Z")).toISOString()).toBe("2026-11-27T15:00:00.000Z")
  })

  it("a escolha do link só aceita continuar ou desistir", () => {
    expect(escolhaDoEndereco("continuar")).toBe("continuar")
    expect(escolhaDoEndereco("desistir")).toBe("desistir")
    expect(escolhaDoEndereco("apagar")).toBeNull()
    expect(escolhaDoEndereco(null)).toBeNull()
  })

  it("RN-248: a carta leva o primeiro nome, a data do cadastro, o prazo e os dois caminhos", () => {
    const carta = montarCartaContinuarOuDesistir({
      nome: "Maria Souza Lima",
      criadoEm: new Date("2026-11-19T13:00:00Z"),
      prazo: new Date("2026-11-27T15:00:00Z"),
      linkContinuar: "https://classificados.teste/continuar-cadastro/abc?escolha=continuar",
      linkDesistir: "https://classificados.teste/continuar-cadastro/abc?escolha=desistir",
    })
    expect(carta.saudacao).toBe("Olá, Maria.")
    const texto = carta.paragrafos.join(" ")
    expect(texto).toContain("19/11/2026")
    expect(texto).toContain("27/11/2026")
    expect(texto).not.toContain("Souza")
    expect(carta.botao?.rotulo).toBe("Continuar com a minha conta")
    expect(carta.segundoBotao?.rotulo).toBe("Apagar minha conta")
    // O segundo botão sai no HTML e no texto puro.
    expect(cartaEmHtml(carta)).toContain("escolha=desistir")
    expect(cartaEmTexto(carta)).toContain("Apagar minha conta:\nhttps://classificados.teste/continuar-cadastro/abc?escolha=desistir")
  })
})

describe("Mandar o e-mail (feature 024)", () => {
  it("RF-240: manda à conta sem confirmação, com os dois links, e guarda só o hash (RN-241)", async () => {
    const t = montar()
    const u = t.conta()
    const r = await t.mandar.executar(u.id)
    expect(r.ok && r.valor.prazo.toISOString()).toBe("2026-11-27T15:00:00.000Z")
    expect(t.correio.enviadas).toHaveLength(1)
    expect(t.correio.enviadas[0]!.para.email).toBe(u.email)
    const carta = t.correio.enviadas[0]!.carta
    expect(carta.botao!.url).toContain("escolha=continuar")
    expect(carta.segundoBotao!.url).toContain("escolha=desistir")
    const codigo = t.codigoDoUltimoEmail()
    expect(t.cadastros.contatos.get(u.id)!.hash).toBe(`h(${codigo})`)
  })

  it("recusa conta confirmada e conta de administrador", async () => {
    const t = montar()
    const confirmada = t.conta({ emailConfirmadoEm: new Date() })
    const admin = t.conta({ perfil: "ADMIN" })
    const r1 = await t.mandar.executar(confirmada.id)
    const r2 = await t.mandar.executar(admin.id)
    expect(!r1.ok && r1.codigo).toBe("JA_CONFIRMADO")
    expect(!r2.ok && r2.codigo).toBe("NAO_SE_APLICA")
    expect(t.correio.enviadas).toHaveLength(0)
  })

  it("RN-247: sem servidor de e-mail ou com falha no envio, nada fica registrado", async () => {
    const t = montar()
    const u = t.conta()
    t.correio.ligado = false
    expect((await t.mandar.executar(u.id)).ok).toBe(false)
    t.correio.ligado = true
    t.correio.falhar = true
    expect((await t.mandar.executar(u.id)).ok).toBe(false)
    expect(t.cadastros.contatos.has(u.id)).toBe(false)
  })

  it("RN-241: mandar de novo troca o link e recomeça o prazo", async () => {
    const t = montar()
    const u = t.conta()
    await t.mandar.executar(u.id)
    const primeiro = t.codigoDoUltimoEmail()
    t.relogio.avancarDias(3)
    await t.mandar.executar(u.id)
    const segundo = t.codigoDoUltimoEmail()
    expect(segundo).not.toBe(primeiro)
    expect(await t.responder.ver(primeiro)).toBeNull()
    const visto = await t.responder.ver(segundo)
    expect(visto?.situacao === "PENDENTE" && visto.apagaEm.toISOString()).toBe("2026-11-30T15:00:00.000Z")
  })
})

describe("Lembrete do Álvaro (feature 024)", () => {
  it("RF-245, RN-240: conta só quem espera contato há mais de 1 hora", async () => {
    const t = montar()
    t.conta({}, 0.5) // acabou de se cadastrar: ainda pode digitar o código
    const esperando = t.conta({}, 3)
    t.conta({ emailConfirmadoEm: new Date() }, 30) // confirmou
    t.conta({ perfil: "ADMIN", emailConfirmadoEm: null }, 30) // administrador não entra
    const contatado = t.conta({}, 48)
    await t.mandar.executar(contatado.id)
    expect(await t.lembrete.contar()).toBe(1)

    // RF-244: o quadro mostra quem espera contato e quem aguarda resposta, com a data.
    const quadro = await t.lembrete.listar()
    expect(quadro.map((c) => c.id).sort()).toEqual([esperando.id, contatado.id].sort())
    expect(quadro.find((c) => c.id === esperando.id)!.esperaContato).toBe(true)
    expect(quadro.find((c) => c.id === contatado.id)!.apagaEm!.toISOString()).toBe("2026-11-27T15:00:00.000Z")
  })
})

describe("Continuar ou desistir pelo link (feature 024)", () => {
  it("RN-242: abrir o link só mostra; nada muda", async () => {
    const t = montar()
    const u = t.conta({ nome: "Maria Souza" })
    await t.mandar.executar(u.id)
    const visto = await t.responder.ver(t.codigoDoUltimoEmail())
    expect(visto).toMatchObject({ situacao: "PENDENTE", primeiroNome: "Maria" })
    expect(t.usuarios.itens.get(u.id)!.emailConfirmadoEm).toBeNull()
    expect(t.usuarios.itens.has(u.id)).toBe(true)
  })

  it("RF-241: continuar confirma o e-mail, dá o presente e o link deixa de valer", async () => {
    const t = montar()
    const u = t.conta()
    await t.mandar.executar(u.id)
    const codigo = t.codigoDoUltimoEmail()
    expect((await t.responder.continuar(codigo)).ok).toBe(true)
    expect(t.usuarios.itens.get(u.id)!.emailConfirmadoEm).toEqual(t.relogio.agora())
    expect(t.presentes).toEqual([u.id])
    expect(await t.responder.ver(codigo)).toBeNull()
    expect(await t.lembrete.listar()).toEqual([])
  })

  it("RF-242: desistir apaga a conta na hora", async () => {
    const t = montar()
    const u = t.conta()
    await t.mandar.executar(u.id)
    const codigo = t.codigoDoUltimoEmail()
    expect((await t.responder.desistir(codigo)).ok).toBe(true)
    expect(t.usuarios.itens.has(u.id)).toBe(false)
    const deNovo = await t.responder.desistir(codigo)
    expect(!deNovo.ok && deNovo.mensagem).toBe(LINK_SEM_VALOR)
  })

  it("RN-243: conta que confirmou pelo código no meio tempo não é apagada pelo link", async () => {
    const t = montar()
    const u = t.conta()
    await t.mandar.executar(u.id)
    const codigo = t.codigoDoUltimoEmail()
    t.usuarios.itens.set(u.id, { ...u, emailConfirmadoEm: t.relogio.agora() })
    expect(await t.responder.ver(codigo)).toEqual({ situacao: "CONFIRMADO" })
    const r = await t.responder.desistir(codigo)
    expect(!r.ok && r.codigo).toBe("JA_CONFIRMADO")
    expect(t.usuarios.itens.has(u.id)).toBe(true)
    // Continuar com a conta já confirmada só encerra o link, sem dar o presente de novo.
    expect((await t.responder.continuar(codigo)).ok).toBe(true)
    expect(t.presentes).toEqual([])
  })

  it("link inventado, vazio ou comprido demais não acha conta", async () => {
    const t = montar()
    expect(await t.responder.ver("qualquer-coisa")).toBeNull()
    expect(await t.responder.ver("")).toBeNull()
    expect(await t.responder.ver("x".repeat(500))).toBeNull()
    const r = await t.responder.continuar("qualquer-coisa")
    expect(!r.ok && r.codigo).toBe("LINK_SEM_VALOR")
  })

  it("RN-246: corrigir o e-mail na tela do código invalida o link mandado ao endereço antigo", async () => {
    const t = montar()
    const u = t.conta()
    await t.mandar.executar(u.id)
    const codigo = t.codigoDoUltimoEmail()
    const corrigir = new CorrigirEmailDoCadastroUseCase(
      t.usuarios,
      { codigosPorEmail: new CodigosPorEmailEmMemoria(), correio: t.correio, codigos: new CodigosDoTeste(), tokens: tokensFalsos, relogio: t.relogio },
      t.cadastros,
    )
    expect((await corrigir.executar(u.id, "maria.certo@exemplo.com")).ok).toBe(true)
    expect(await t.responder.ver(codigo)).toBeNull()
    const r = await t.responder.continuar(codigo)
    expect(!r.ok && r.codigo).toBe("LINK_SEM_VALOR")
    expect(t.usuarios.itens.get(u.id)!.emailConfirmadoEm).toBeNull()
  })
})

describe("Rodada diária (feature 024)", () => {
  it("RF-243: apaga quem não respondeu em 7 dias; deixa quem ainda está no prazo, quem confirmou e quem tem anúncio (RN-243)", async () => {
    const t = montar()
    const semResposta = t.conta()
    const confirmou = t.conta()
    const comAnuncio = t.conta()
    for (const u of [semResposta, confirmou, comAnuncio]) await t.mandar.executar(u.id)
    t.cadastros.comAnuncioOuPagamento.add(comAnuncio.id)
    t.relogio.avancarDias(3)
    const noPrazo = t.conta()
    await t.mandar.executar(noPrazo.id)
    t.usuarios.itens.set(confirmou.id, { ...confirmou, emailConfirmadoEm: t.relogio.agora() })

    t.relogio.instante = new Date(t.relogio.instante.getTime() + 4 * DIA)
    expect(await t.rodada.executar()).toEqual({ apagados: 1 })
    expect(t.usuarios.itens.has(semResposta.id)).toBe(false)
    expect(t.usuarios.itens.has(noPrazo.id)).toBe(true)
    expect(t.usuarios.itens.has(confirmou.id)).toBe(true)
    expect(t.usuarios.itens.has(comAnuncio.id)).toBe(true)

    // A rodada pode repetir no mesmo dia sem apagar nada a mais.
    expect(await t.rodada.executar()).toEqual({ apagados: 0 })
  })
})
