// Feature 013 — visitas do anúncio: quem conta, a pessoa sem IP, o dia de Brasília, a cidade e o resumo do dono.
import { describe, expect, it } from "vitest"
import type { AnuncioRegistro } from "@/application/ports/caderno"
import { type EntradaDaVisita, RegistrarVisitaUseCase, ResumirVisitasUseCase } from "@/application/use-cases/anuncios/visitas"
import { ESTILO_PADRAO } from "@/domain/anuncio/anuncio"
import {
  LIMITE_DE_VISITAS_POR_PESSOA_NO_DIA,
  cidadesDasVisitas,
  diaDeBrasilia,
  ehRobo,
  localDaVisita,
  normalizarIp,
  resumirVisitas,
  somarDias,
  ultimosDias,
} from "@/domain/anuncio/visitas"
import { HmacAnonimizadorDeVisitante } from "@/infrastructure/visitas"
import { vemDoProprioSite } from "@/lib/visitas"
import { AnonimizadorFalso, AnunciosEmMemoria, RelogioFixo, VisitasEmMemoria } from "../fakes"

const CHROME_ANDROID = "Mozilla/5.0 (Linux; Android 14; SM-A155M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36"
const SAFARI_IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1"

describe("Dia de Brasília (RN-133)", () => {
  it("23h30 em Brasília ainda é o mesmo dia, mesmo já sendo o dia seguinte em UTC", () => {
    expect(diaDeBrasilia(new Date("2026-11-13T02:30:00Z"))).toBe("2026-11-12")
    expect(diaDeBrasilia(new Date("2026-11-13T03:00:00Z"))).toBe("2026-11-13")
  })

  it("soma dias e lista os últimos dias atravessando o mês", () => {
    expect(somarDias("2026-12-01", -1)).toBe("2026-11-30")
    expect(ultimosDias("2026-12-02", 4)).toEqual(["2026-11-29", "2026-11-30", "2026-12-01", "2026-12-02"])
  })
})

describe("A pessoa sem IP (RN-131)", () => {
  it("IPv4 inteiro, sem porta, e só o primeiro da lista do x-forwarded-for", () => {
    expect(normalizarIp("189.6.10.20")).toBe("189.6.10.20")
    expect(normalizarIp("189.6.10.20:51234")).toBe("189.6.10.20")
    expect(normalizarIp("189.6.10.20, 10.0.0.1")).toBe("189.6.10.20")
    expect(normalizarIp("::ffff:189.6.10.20")).toBe("189.6.10.20")
  })

  it("IPv6 só pela rede (/64): o mesmo aparelho trocando a outra metade continua a mesma pessoa", () => {
    const a = normalizarIp("2804:14c:5b80:8e23:a1b2:c3d4:e5f6:1")
    const b = normalizarIp("2804:14c:5b80:8e23:ffff:1:2:3")
    expect(a).toBe("2804:14c:5b80:8e23::/64")
    expect(b).toBe(a)
    expect(normalizarIp("2804:14c:5b80:8e24::1")).not.toBe(a)
  })

  it("endereço ilegível vira null", () => {
    expect(normalizarIp("")).toBeNull()
    expect(normalizarIp(null)).toBeNull()
    expect(normalizarIp("999.1.1.1")).toBeNull()
    expect(normalizarIp("não é ip")).toBeNull()
  })

  it("a chave HMAC não contém o IP, muda de um anúncio para outro e não existe sem o segredo", () => {
    const anonimizador = new HmacAnonimizadorDeVisitante("s".repeat(32))
    const chave = anonimizador.chave("anuncio-1", "189.6.10.20", CHROME_ANDROID)
    expect(anonimizador.ligado).toBe(true)
    expect(chave).toMatch(/^[0-9a-f]{64}$/)
    expect(chave).not.toContain("189")
    expect(anonimizador.chave("anuncio-1", "189.6.10.20", CHROME_ANDROID)).toBe(chave)
    expect(anonimizador.chave("anuncio-2", "189.6.10.20", CHROME_ANDROID)).not.toBe(chave)
    // Mesmo IP (CGNAT do celular), outro aparelho: outra pessoa.
    expect(anonimizador.chave("anuncio-1", "189.6.10.20", SAFARI_IPHONE)).not.toBe(chave)
    expect(new HmacAnonimizadorDeVisitante("s".repeat(31)).ligado).toBe(false)
    expect(new HmacAnonimizadorDeVisitante(undefined).chave("anuncio-1", "189.6.10.20", CHROME_ANDROID)).toBeNull()
  })
})

describe("Robôs e prévias de link não contam (RN-130)", () => {
  it.each([
    ["Google", "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"],
    ["prévia do WhatsApp", "WhatsApp/2.24.21.80 A"],
    ["prévia do Facebook", "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"],
    ["prévia do Telegram", "TelegramBot (like TwitterBot)"],
    ["Bing", "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)"],
    ["navegador sem janela", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/130.0.0.0 Safari/537.36"],
    ["programa", "curl/8.5.0"],
    ["vazio", ""],
  ])("%s é robô", (_nome, navegador) => {
    expect(ehRobo(navegador)).toBe(true)
  })

  it.each([
    ["Chrome no Android", CHROME_ANDROID],
    ["Safari no iPhone", SAFARI_IPHONE],
    ["dentro do Instagram", `${SAFARI_IPHONE.replace(" Safari/604.1", "")} Instagram 356.0.0.30.84 (iPhone15,3; iOS 18_1; pt_BR)`],
    ["dentro do Facebook", `${CHROME_ANDROID} [FB_IAB/FB4A;FBAV/489.0.0.47.109;]`],
    ["celular Cubot", "Mozilla/5.0 (Linux; Android 12; CUBOT X70) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36"],
  ])("%s é gente", (_nome, navegador) => {
    expect(ehRobo(navegador)).toBe(false)
  })
})

describe("De onde vem a visita (RN-132)", () => {
  it("cidade decodificada, UF só no Brasil e só se existir", () => {
    expect(localDaVisita({ cidade: "Bras%C3%ADlia", regiao: "DF", pais: "BR" })).toEqual({ cidade: "Brasília", uf: "DF", pais: "BR" })
    expect(localDaVisita({ cidade: "S%C3%A3o%20Paulo", regiao: "XX", pais: "br" })).toEqual({ cidade: "São Paulo", uf: null, pais: "BR" })
    expect(localDaVisita({ cidade: "Lisbon", regiao: "11", pais: "PT" })).toEqual({ cidade: "Lisbon", uf: null, pais: "PT" })
  })

  it("sem nada, nada; texto estranho é limpo e cortado", () => {
    expect(localDaVisita({})).toEqual({ cidade: null, uf: null, pais: null })
    expect(localDaVisita({ cidade: "%E0%A4%A", pais: "Brasil" })).toEqual({ cidade: "%E0%A4%A", uf: null, pais: null })
    expect(localDaVisita({ cidade: "<script>x</script>" }).cidade).toBe("scriptx/script")
    expect(localDaVisita({ cidade: "a".repeat(200) }).cidade).toHaveLength(80)
  })
})

describe("Resumo do dono (RF-131, RF-132, RN-136)", () => {
  it("a série tem todos os dias, com zero onde não houve visita, e a semana soma só 7 dias", () => {
    const r = resumirVisitas({
      visitas: 50,
      pessoas: 9,
      hoje: "2026-11-30",
      quantidadeDeDias: 30,
      linhas: [
        { dia: "2026-11-30", visitas: 4, pessoas: 3 },
        { dia: "2026-11-24", visitas: 2, pessoas: 2 },
        { dia: "2026-11-23", visitas: 7, pessoas: 1 },
      ],
    })
    expect(r.dias).toHaveLength(30)
    expect(r.dias[0]).toEqual({ dia: "2026-11-01", visitas: 0, pessoas: 0 })
    expect(r.dias[29]).toEqual({ dia: "2026-11-30", visitas: 4, pessoas: 3 })
    expect(r.hoje).toEqual({ dia: "2026-11-30", visitas: 4, pessoas: 3 })
    expect(r.visitasNaSemana).toBe(6)
    expect(r.maiorDia).toBe(7)
    // RN-136: o total vem do anúncio, com o que já havia sido contado antes.
    expect(r.visitas).toBe(50)
  })

  it("sem visita nenhuma, tudo zero", () => {
    const r = resumirVisitas({ visitas: 0, pessoas: 0, hoje: "2026-11-12", quantidadeDeDias: 7, linhas: [] })
    expect(r.dias.map((d) => d.visitas)).toEqual([0, 0, 0, 0, 0, 0, 0])
    expect(r.maiorDia).toBe(0)
  })

  it("cidades com mais pessoas primeiro; depois das 10, o resto em Outras cidades; fora do Brasil e sem local no fim", () => {
    const linhas = [
      { cidade: "Brasília", uf: "DF", pais: "BR", pessoas: 5 },
      { cidade: "Lisbon", uf: null, pais: "PT", pessoas: 1 },
      { cidade: null, uf: null, pais: "BR", pessoas: 2 },
      ...Array.from({ length: 11 }, (_, i) => ({ cidade: `Cidade ${String(i).padStart(2, "0")}`, uf: "GO", pais: "BR", pessoas: 1 })),
      { cidade: "Taguatinga", uf: "DF", pais: "BR", pessoas: 3 },
    ]
    const cidades = cidadesDasVisitas(linhas)
    expect(cidades.slice(0, 3).map((c) => c.nome)).toEqual(["Brasília/DF", "Taguatinga/DF", "Cidade 00/GO"])
    expect(cidades.filter((c) => !c.agrupada)).toHaveLength(10)
    expect(cidades.slice(-3)).toEqual([
      { nome: "Outras cidades", pessoas: 3, agrupada: true },
      { nome: "Fora do Brasil", pessoas: 1, agrupada: true },
      { nome: "Sem localização", pessoas: 2, agrupada: true },
    ])
  })
})

describe("Vem do próprio site (RN-130)", () => {
  it("aceita o aviso da mesma origem e recusa o de outro site", () => {
    expect(vemDoProprioSite(new Headers({ "sec-fetch-site": "same-origin" }))).toBe(true)
    expect(vemDoProprioSite(new Headers({ "sec-fetch-site": "cross-site", origin: "https://classificados.teste", host: "classificados.teste" }))).toBe(false)
    expect(vemDoProprioSite(new Headers({ origin: "https://classificados.teste", host: "classificados.teste" }))).toBe(true)
    expect(vemDoProprioSite(new Headers({ origin: "https://outro.teste", host: "classificados.teste" }))).toBe(false)
    expect(vemDoProprioSite(new Headers({ host: "classificados.teste" }))).toBe(false)
  })
})

// ── Casos de uso ──

const DONO = "usuario-dono"
const NOVEMBRO_12_AS_10H = new Date("2026-11-12T13:00:00Z")

function montar({ comSegredo = true } = {}) {
  const relogio = new RelogioFixo(NOVEMBRO_12_AS_10H)
  const anuncios = new AnunciosEmMemoria()
  const visitas = new VisitasEmMemoria()
  const anonimizador = new AnonimizadorFalso(comSegredo)
  const anuncio = (id: string, codigo: string, extra: Partial<AnuncioRegistro> = {}) =>
    anuncios.itens.set(id, {
      id,
      codigo,
      usuarioId: DONO,
      categoriaId: "veiculos",
      uf: "DF",
      cidadeCodigo: 5300108,
      titulo: "Astra Sedan Expression 2002",
      texto: "Completo, revisado.",
      precoCentavos: 1_800_000,
      estilo: ESTILO_PADRAO,
      situacao: "PUBLICADO",
      planoCodigo: "FOTOS",
      prioridade: 1,
      publicadoEm: new Date("2026-11-11T17:26:00Z"),
      expiraEm: new Date("2026-11-18T17:26:00Z"),
      ...extra,
    })
  anuncio("a1", "4DPUMX")
  anuncio("a2", "GQPR23")
  return {
    relogio,
    anuncios,
    visitas,
    anonimizador,
    anuncio,
    registrar: new RegistrarVisitaUseCase(anuncios, visitas, anonimizador, relogio),
    resumir: new ResumirVisitasUseCase(visitas, anonimizador, relogio),
  }
}

function visita(extra: Partial<EntradaDaVisita> = {}): EntradaDaVisita {
  return {
    codigo: "4DPUMX",
    ip: "189.6.10.20",
    navegador: CHROME_ANDROID,
    local: { cidade: "Bras%C3%ADlia", regiao: "DF", pais: "BR" },
    quemVe: null,
    ...extra,
  }
}

describe("Contar a visita (RF-130, RN-130, RN-134, RN-135)", () => {
  it("RF-130: a primeira visita do dia é pessoa nova; a seguinte soma visita, não pessoa", async () => {
    const t = montar()
    expect(await t.registrar.executar(visita())).toEqual({ contada: true, pessoa: "NOVA" })
    expect(await t.registrar.executar(visita())).toEqual({ contada: true, pessoa: "REPETIDA" })
    expect(t.anuncios.visitas.get("4DPUMX")).toBe(2)
    expect(t.visitas.linhas).toHaveLength(1)
    expect(t.visitas.linhas[0]).toMatchObject({ anuncioId: "a1", dia: "2026-11-12", vezes: 2, local: { cidade: "Brasília", uf: "DF", pais: "BR" } })
  })

  it("o código vale em minúsculas, como no link digitado", async () => {
    const t = montar()
    expect(await t.registrar.executar(visita({ codigo: "4dpumx" }))).toMatchObject({ contada: true })
  })

  it("RN-130: o dono e o administrador logados não contam", async () => {
    const t = montar()
    expect(await t.registrar.executar(visita({ quemVe: { id: DONO, perfil: "ANUNCIANTE" } }))).toEqual({ contada: false, motivo: "DONO" })
    expect(await t.registrar.executar(visita({ quemVe: { id: "admin", perfil: "ADMIN" } }))).toEqual({ contada: false, motivo: "ADMIN" })
    expect(t.anuncios.visitas.size).toBe(0)
    // Outro anunciante logado vendo o anúncio é visita como qualquer outra.
    expect(await t.registrar.executar(visita({ quemVe: { id: "outro", perfil: "ANUNCIANTE" } }))).toMatchObject({ contada: true })
  })

  it("RN-130: robô não conta", async () => {
    const t = montar()
    expect(await t.registrar.executar(visita({ navegador: "WhatsApp/2.24.21.80 A" }))).toEqual({ contada: false, motivo: "ROBO" })
    expect(t.visitas.linhas).toHaveLength(0)
  })

  it("RN-130: anúncio fora do ar, removido, inexistente ou com código inválido não conta", async () => {
    const t = montar()
    t.anuncio("a3", "VENCEU", { expiraEm: new Date("2026-11-12T12:59:00Z") })
    t.anuncio("a4", "REMVDA", { situacao: "REMOVIDO" })
    t.anuncio("a5", "PAGAR2", { situacao: "AGUARDANDO_PAGAMENTO", expiraEm: null })
    for (const codigo of ["VENCEU", "REMVDA", "PAGAR2", "ZZZZZZ", "1"]) {
      expect(await t.registrar.executar(visita({ codigo }))).toEqual({ contada: false, motivo: "FORA_DO_AR" })
    }
    expect(t.anuncios.visitas.size).toBe(0)
  })

  it("sem IP legível não conta", async () => {
    const t = montar()
    expect(await t.registrar.executar(visita({ ip: null }))).toEqual({ contada: false, motivo: "SEM_IP" })
  })

  it(`RN-134: a mesma pessoa soma no máximo ${LIMITE_DE_VISITAS_POR_PESSOA_NO_DIA} visitas por dia em cada anúncio`, async () => {
    const t = montar()
    for (let i = 0; i < LIMITE_DE_VISITAS_POR_PESSOA_NO_DIA; i++) await t.registrar.executar(visita())
    expect(await t.registrar.executar(visita())).toEqual({ contada: false, motivo: "NO_LIMITE" })
    expect(t.anuncios.visitas.get("4DPUMX")).toBe(LIMITE_DE_VISITAS_POR_PESSOA_NO_DIA)
    // No dia seguinte, volta a contar.
    t.relogio.avancarDias(1)
    expect(await t.registrar.executar(visita())).toEqual({ contada: true, pessoa: "NOVA" })
  })

  it("RN-133: passou da meia-noite de Brasília, é outro dia e a pessoa conta de novo no dia", async () => {
    const t = montar()
    t.relogio.instante = new Date("2026-11-13T02:59:00Z") // 23h59 do dia 12 em Brasília
    await t.registrar.executar(visita())
    t.relogio.instante = new Date("2026-11-13T03:01:00Z") // 0h01 do dia 13
    expect(await t.registrar.executar(visita())).toEqual({ contada: true, pessoa: "NOVA" })
    expect(t.visitas.linhas.map((l) => l.dia)).toEqual(["2026-11-12", "2026-11-13"])
  })

  it("RN-135: sem o segredo, só o total sobe", async () => {
    const t = montar({ comSegredo: false })
    expect(await t.registrar.executar(visita())).toEqual({ contada: true, pessoa: null })
    expect(t.anuncios.visitas.get("4DPUMX")).toBe(1)
    expect(t.visitas.linhas).toHaveLength(0)
  })
})

describe("O que o dono vê (RF-131, RF-132, RN-135)", () => {
  it("RF-131: na lista, cada anúncio com o total, as pessoas, hoje e os 7 dias", async () => {
    const t = montar()
    await t.registrar.executar(visita())
    await t.registrar.executar(visita())
    await t.registrar.executar(visita({ ip: "177.10.1.1", navegador: SAFARI_IPHONE }))
    t.relogio.avancarDias(-2)
    await t.registrar.executar(visita())
    t.relogio.avancarDias(2)

    const resumos = await t.resumir.daLista([
      { id: "a1", visualizacoes: 10 },
      { id: "a2", visualizacoes: 0 },
    ])
    const astra = resumos.get("a1")!
    expect(astra.visitas).toBe(10)
    expect(astra.pessoas).toBe(2)
    expect(astra.hoje).toEqual({ dia: "2026-11-12", visitas: 3, pessoas: 2 })
    expect(astra.visitasNaSemana).toBe(4)
    expect(astra.dias.map((d) => d.visitas)).toEqual([0, 0, 0, 0, 1, 0, 3])
    expect(resumos.get("a2")).toMatchObject({ visitas: 0, pessoas: 0, visitasNaSemana: 0 })
  })

  it("RF-132: na tela do anúncio, 30 dias e as cidades das pessoas", async () => {
    const t = montar()
    await t.registrar.executar(visita())
    await t.registrar.executar(visita({ ip: "177.10.1.1", local: { cidade: "Goi%C3%A2nia", regiao: "GO", pais: "BR" } }))
    await t.registrar.executar(visita({ ip: "177.10.1.2", local: { cidade: "Bras%C3%ADlia", regiao: "DF", pais: "BR" } }))
    const detalhe = await t.resumir.doAnuncio({ id: "a1", visualizacoes: 3 })
    expect(detalhe.resumo.dias).toHaveLength(30)
    expect(detalhe.cidades).toEqual([
      { nome: "Brasília/DF", pessoas: 2, agrupada: false },
      { nome: "Goiânia/GO", pessoas: 1, agrupada: false },
    ])
  })

  it("RN-135: sem o segredo, a tela não mostra pessoas nem cidades", async () => {
    const t = montar({ comSegredo: false })
    await t.registrar.executar(visita())
    const detalhe = await t.resumir.doAnuncio({ id: "a1", visualizacoes: 1 })
    expect(detalhe.resumo.pessoas).toBeNull()
    expect(detalhe.resumo.visitas).toBe(1)
    expect(detalhe.cidades).toEqual([])
  })
})
