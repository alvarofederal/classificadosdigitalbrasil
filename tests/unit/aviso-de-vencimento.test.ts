// Feature 012 — aviso de vencimento por e-mail: carta, quem recebe, rodada diária e segredo do agendador.
import { describe, expect, it } from "vitest"
import { AvisarVencimentosUseCase } from "@/application/use-cases/anuncios/vencimento"
import { AVISOS_DE_VENCIMENTO_POR_RODADA, montarAvisoDeVencimento, podeReceberEmail, quandoSaiDoCaderno } from "@/domain/anuncio/vencimento"
import { autorizadoPeloAgendador } from "@/lib/agendador"
import { AvisosDeVencimentoEmMemoria, CorreioFalso, RelogioFixo, enderecosDeTeste } from "../fakes"

const HORA = 3_600_000
// 17/11/2026 às 9h em Brasília: a hora da rodada (ADR-17).
const RODADA = new Date("2026-11-17T12:00:00Z")
// 18/11/2026 às 14:26 em Brasília: o fim do Astra.
const FIM_DO_ASTRA = new Date("2026-11-18T17:26:00Z")

const ASTRA = { codigo: "4DPUMX", titulo: "Astra Sedan Expression 2002", expiraEm: FIM_DO_ASTRA, visualizacoes: 12 }

function carta(anuncio = ASTRA, agora = RODADA) {
  return montarAvisoDeVencimento({
    dono: { nome: "Álvaro Pereira Gomes" },
    anuncio,
    agora,
    linkParaRenovar: "https://classificados.teste/minha-conta/anuncios/a1",
    linkDoAnuncio: "https://classificados.teste/anuncio/4DPUMX",
  })
}

describe("Carta do aviso de vencimento (RF-120, RN-125)", () => {
  it("RF-120: diz quando sai, as visitas, e leva o botão de renovar e o link do anúncio", () => {
    const c = carta()
    expect(c.assunto).toBe('Seu anúncio "Astra Sedan Expression 2002" sai do caderno amanhã')
    expect(c.saudacao).toBe("Olá, Álvaro.")
    expect(c.paragrafos[0]).toBe('Seu anúncio "Astra Sedan Expression 2002" (código 4DPUMX) sai do caderno amanhã, 18/11, às 14:26.')
    expect(c.paragrafos[1]).toBe("Até agora ele teve 12 visitas na página do anúncio.")
    expect(c.paragrafos[2]).toContain("os dias novos entram depois do prazo atual")
    expect(c.botao).toEqual({ rotulo: "Renovar o anúncio", url: "https://classificados.teste/minha-conta/anuncios/a1" })
    expect(c.linhas).toEqual([{ rotulo: "Página do anúncio", valor: "https://classificados.teste/anuncio/4DPUMX", link: "https://classificados.teste/anuncio/4DPUMX" }])
    expect(c.responderPara).toBeNull()
  })

  it("RF-120: hoje, amanhã ou a data, sempre no dia e na hora de Brasília", () => {
    expect(quandoSaiDoCaderno(new Date("2026-11-17T20:00:00Z"), RODADA)).toMatchObject({ dia: "HOJE", texto: "hoje, às 17:00" })
    expect(quandoSaiDoCaderno(FIM_DO_ASTRA, RODADA)).toMatchObject({ dia: "AMANHA", texto: "amanhã, 18/11, às 14:26" })
    // 02:30 UTC do dia 19 ainda é 23:30 do dia 18 em Brasília.
    expect(quandoSaiDoCaderno(new Date("2026-11-19T02:30:00Z"), RODADA)).toMatchObject({ dia: "AMANHA", texto: "amanhã, 18/11, às 23:30" })
    expect(quandoSaiDoCaderno(new Date("2026-11-19T10:00:00Z"), RODADA)).toMatchObject({ dia: "DEPOIS", texto: "em 19/11, às 07:00", curto: "em 19/11" })
    // Meia-noite e meia sai como 00:30, não como 24:30.
    expect(quandoSaiDoCaderno(new Date("2026-11-18T03:30:00Z"), RODADA).texto).toBe("amanhã, 18/11, às 00:30")
  })

  it("RF-120: visitas no singular, com milhar, e nenhuma linha quando não houve visita", () => {
    expect(carta({ ...ASTRA, visualizacoes: 1 }).paragrafos[1]).toBe("Até agora ele teve 1 visita na página do anúncio.")
    expect(carta({ ...ASTRA, visualizacoes: 1234 }).paragrafos[1]).toBe("Até agora ele teve 1.234 visitas na página do anúncio.")
    const semVisita = carta({ ...ASTRA, visualizacoes: 0 })
    expect(semVisita.paragrafos).toHaveLength(2)
    expect(semVisita.paragrafos.join(" ")).not.toContain("visita")
  })

  it("RN-125: só o primeiro nome do dono e o lembrete de que renovar é pelo site", () => {
    const c = carta()
    expect(JSON.stringify(c)).not.toContain("Pereira")
    expect(c.observacoes.join(" ")).toContain("Renovar é sempre pelo site, em Minha conta")
    expect(c.observacoes.join(" ")).toContain("não pede pagamento por mensagem, e-mail ou telefone")
  })
})

describe("Quem recebe o aviso (RN-122)", () => {
  it("endereço comum recebe; domínio reservado para teste e endereço sem domínio, não", () => {
    for (const bom of ["dono@gmail.com", "maria@exemplo.com.br", "a@examples.com", "a@myexample.com"]) expect(podeReceberEmail(bom)).toBe(true)
    for (const ruim of [
      "exemplos@exemplo.classificados.test",
      "a@b.example",
      "a@x.invalid",
      "a@foo.localhost",
      "a@localhost",
      "a@example.com",
      "a@sub.example.org",
      "a@EXAMPLE.NET",
      "sem-arroba",
      "a@@b.com",
    ]) {
      expect(podeReceberEmail(ruim)).toBe(false)
    }
  })
})

function montar() {
  const avisos = new AvisosDeVencimentoEmMemoria()
  const correio = new CorreioFalso()
  const relogio = new RelogioFixo(RODADA)
  const avisar = new AvisarVencimentosUseCase(avisos, correio, relogio, enderecosDeTeste)
  return { avisos, correio, relogio, avisar }
}

describe("Rodada diária do aviso de vencimento (RF-120, RF-122, RN-120 a RN-124)", () => {
  it("RF-120: avisa quem sai nas próximas 36 horas, os que saem antes primeiro; ignora o resto", () => {
    const t = montar()
    t.avisos.adicionar({ id: "astra", codigo: "4DPUMX", titulo: "Astra Sedan Expression 2002", expiraEm: FIM_DO_ASTRA, visualizacoes: 12 })
    t.avisos.adicionar({ id: "hoje", expiraEm: new Date(RODADA.getTime() + 5 * HORA) })
    t.avisos.adicionar({ id: "longe", expiraEm: new Date(RODADA.getTime() + 37 * HORA) })
    t.avisos.adicionar({ id: "vencido", expiraEm: new Date(RODADA.getTime() - HORA) })
    t.avisos.adicionar({ id: "fora", expiraEm: new Date(RODADA.getTime() + 2 * HORA) }, { noAr: false })

    return t.avisar.executar().then((resumo) => {
      expect(resumo).toEqual({ ligado: true, encontrados: 2, enviados: 2, ignorados: 0, falhas: 0 })
      expect(t.correio.enviadas.map((e) => e.carta.botao?.url)).toEqual([
        "https://classificados.teste/minha-conta/anuncios/hoje",
        "https://classificados.teste/minha-conta/anuncios/astra",
      ])
      const astra = t.correio.enviadas[1]
      expect(astra.para).toEqual({ nome: "Álvaro Federal", email: "dono@exemplo.com.br" })
      expect(astra.carta.assunto).toBe('Seu anúncio "Astra Sedan Expression 2002" sai do caderno amanhã')
      expect(astra.carta.linhas[0].link).toBe("https://classificados.teste/anuncio/4DPUMX")
    })
  })

  it("RN-120: rodar de novo no mesmo dia não manda outro e-mail", async () => {
    const t = montar()
    t.avisos.adicionar({ id: "astra", expiraEm: FIM_DO_ASTRA })
    await t.avisar.executar()
    t.relogio.instante = new Date(RODADA.getTime() + HORA)
    expect(await t.avisar.executar()).toMatchObject({ encontrados: 0, enviados: 0 })
    expect(t.correio.enviadas).toHaveLength(1)
  })

  it("RN-120: renovado, o prazo novo ganha o seu aviso quando chega perto do fim", async () => {
    const t = montar()
    t.avisos.adicionar({ id: "astra", expiraEm: FIM_DO_ASTRA })
    await t.avisar.executar()
    // Renovou por 7 dias antes do fim: o prazo novo começa depois do atual (RN-12).
    const anuncio = t.avisos.itens[0]
    anuncio.expiraEm = new Date(FIM_DO_ASTRA.getTime() + 7 * 24 * HORA)
    t.relogio.avancarDias(1)
    expect((await t.avisar.executar()).enviados).toBe(0)
    t.relogio.avancarDias(6)
    expect((await t.avisar.executar()).enviados).toBe(1)
    expect(t.correio.enviadas).toHaveLength(2)
  })

  it("RN-120: se outra rodada marcou o anúncio primeiro, esta não envia", async () => {
    const t = montar()
    t.avisos.adicionar({ id: "astra", expiraEm: FIM_DO_ASTRA })
    t.avisos.outraRodadaMarcou.add("astra")
    expect(await t.avisar.executar()).toEqual({ ligado: true, encontrados: 1, enviados: 0, ignorados: 0, falhas: 0 })
    expect(t.correio.enviadas).toHaveLength(0)
  })

  it("RN-121: falha no envio desfaz a marca, e a rodada seguinte tenta de novo", async () => {
    const t = montar()
    t.avisos.adicionar({ id: "astra", expiraEm: FIM_DO_ASTRA })
    t.correio.falhar = true
    expect(await t.avisar.executar()).toMatchObject({ enviados: 0, falhas: 1 })
    expect(t.avisos.itens[0].avisadoPara).toBeNull()

    t.correio.falhar = false
    t.relogio.instante = new Date(RODADA.getTime() + 2 * HORA)
    expect(await t.avisar.executar()).toMatchObject({ enviados: 1, falhas: 0 })
  })

  it("RN-121: correio que lança erro também conta como falha e não deixa a marca presa", async () => {
    const t = montar()
    t.avisos.adicionar({ id: "astra", expiraEm: FIM_DO_ASTRA })
    t.correio.enviar = async () => {
      throw new Error("pane no correio")
    }
    expect(await t.avisar.executar()).toMatchObject({ enviados: 0, falhas: 1 })
    expect(t.avisos.itens[0].avisadoPara).toBeNull()
  })

  it("RN-122: conta desativada e endereço de teste ficam marcados, sem envio e sem voltar na rodada seguinte", async () => {
    const t = montar()
    t.avisos.adicionar({ id: "inativo", expiraEm: FIM_DO_ASTRA, dono: { nome: "Ana", email: "ana@gmail.com", ativo: false } })
    t.avisos.adicionar({ id: "exemplo", expiraEm: FIM_DO_ASTRA, dono: { nome: "Exemplos", email: "exemplos@exemplo.classificados.test", ativo: true } })
    expect(await t.avisar.executar()).toEqual({ ligado: true, encontrados: 2, enviados: 0, ignorados: 2, falhas: 0 })
    expect(t.correio.enviadas).toHaveLength(0)
    expect(await t.avisar.executar()).toMatchObject({ encontrados: 0 })
  })

  it("RF-122: sem servidor de e-mail, nada é enviado nem marcado", async () => {
    const t = montar()
    t.avisos.adicionar({ id: "astra", expiraEm: FIM_DO_ASTRA })
    t.correio.ligado = false
    expect(await t.avisar.executar()).toEqual({ ligado: false, encontrados: 0, enviados: 0, ignorados: 0, falhas: 0 })
    expect(t.avisos.itens[0].avisadoPara).toBeNull()
  })

  it("RN-124: no máximo 200 por rodada; o que sobra sai na rodada seguinte", async () => {
    const t = montar()
    for (let i = 0; i <= AVISOS_DE_VENCIMENTO_POR_RODADA; i++) {
      t.avisos.adicionar({ id: `a${i}`, expiraEm: new Date(FIM_DO_ASTRA.getTime() + i * 60_000) })
    }
    expect((await t.avisar.executar()).enviados).toBe(AVISOS_DE_VENCIMENTO_POR_RODADA)
    t.relogio.instante = new Date(RODADA.getTime() + HORA)
    expect((await t.avisar.executar()).enviados).toBe(1)
  })
})

describe("Segredo do agendador (RN-123)", () => {
  it("só passa com o cabeçalho exato do agendador; sem segredo configurado, recusa sempre", () => {
    expect(autorizadoPeloAgendador("Bearer s3gr3d0", "s3gr3d0")).toBe(true)
    expect(autorizadoPeloAgendador("Bearer outro00", "s3gr3d0")).toBe(false)
    expect(autorizadoPeloAgendador("s3gr3d0", "s3gr3d0")).toBe(false)
    expect(autorizadoPeloAgendador("Bearer s3gr3d0 ", "s3gr3d0")).toBe(false)
    expect(autorizadoPeloAgendador(null, "s3gr3d0")).toBe(false)
    expect(autorizadoPeloAgendador("Bearer ", "")).toBe(false)
    expect(autorizadoPeloAgendador("Bearer undefined", undefined)).toBe(false)
    expect(autorizadoPeloAgendador("Bearer    ", "   ")).toBe(false)
  })
})
