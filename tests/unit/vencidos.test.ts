// Feature 018 — vencidos guardados por 180 dias e mensagens por 90: prazos, rodada diária, aviso antes de apagar e o apagado que não volta.
import { describe, expect, it } from "vitest"
import type { PagamentoRegistro } from "@/application/ports/caderno"
import { ApagarVencidosUseCase, AvisarAntesDeApagarUseCase } from "@/application/use-cases/anuncios/guarda"
import { AtivarOuDesativarAnuncioUseCase, EditarAnuncioUseCase, RemoverAnuncioUseCase } from "@/application/use-cases/anuncios/gerenciar-anuncios"
import { ConfirmarPagamentoUseCase, PublicarCortesiaUseCase, SolicitarRenovacaoUseCase } from "@/application/use-cases/pagamentos/pagamentos"
import { ESTILO_PADRAO, situacaoExibida } from "@/domain/anuncio/anuncio"
import {
  APAGADOS_POR_RODADA,
  cortesDaRodada,
  guardadoAte,
  mensagensAte,
  mensagensVencidas,
  montarAvisoDeApagar,
} from "@/domain/anuncio/guarda"
import { podePerguntarResultado } from "@/domain/anuncio/resultado"
import { montarAvisoDeVencimento } from "@/domain/anuncio/vencimento"
import { conferirUsoDoBanco } from "@/domain/banco/banco-de-dias"
import {
  AnunciosEmMemoria,
  CorreioFalso,
  GatewayFalso,
  GuardaEmMemoria,
  PagamentosEmMemoria,
  RelogioFixo,
  caderno,
  enderecosDeTeste,
  localidades,
  storageFalso,
} from "../fakes"

const DIA = 86_400_000
// 24/05/2027 às 10h em Brasília: a hora da rodada (ADR-24).
const RODADA = new Date("2027-05-24T13:00:00Z")
// 18/11/2026 às 14:26 em Brasília: o fim do Astra.
const FIM_DO_ASTRA = new Date("2026-11-18T17:26:00Z")
const venceuHa = (dias: number) => new Date(RODADA.getTime() - dias * DIA)

describe("Prazos da guarda (RN-182 a RN-184, RN-188)", () => {
  const criadoEm = new Date("2026-11-11T17:20:00Z")

  it("RN-182: o vencido fica guardado 180 dias depois do fim do prazo, publicado ou desativado", () => {
    expect(guardadoAte({ situacao: "PUBLICADO", expiraEm: FIM_DO_ASTRA, criadoEm })?.toISOString()).toBe("2027-05-17T17:26:00.000Z")
    expect(guardadoAte({ situacao: "DESATIVADO", expiraEm: FIM_DO_ASTRA, criadoEm })?.toISOString()).toBe("2027-05-17T17:26:00.000Z")
  })

  it("RN-182: renovar muda o fim do prazo, e a guarda conta do fim novo", () => {
    const renovado = new Date(FIM_DO_ASTRA.getTime() + 30 * DIA)
    expect(guardadoAte({ situacao: "PUBLICADO", expiraEm: renovado, criadoEm })?.getTime()).toBe(renovado.getTime() + 180 * DIA)
  })

  it("RN-184: o que nunca foi ao ar fica 180 dias contados da criação", () => {
    expect(guardadoAte({ situacao: "AGUARDANDO_PAGAMENTO", expiraEm: null, criadoEm })?.toISOString()).toBe("2027-05-10T17:20:00.000Z")
  })

  it("RN-188: removido e apagado não têm data para apagar", () => {
    expect(guardadoAte({ situacao: "REMOVIDO", expiraEm: FIM_DO_ASTRA, criadoEm })).toBeNull()
    expect(guardadoAte({ situacao: "APAGADO", expiraEm: FIM_DO_ASTRA, criadoEm })).toBeNull()
  })

  it("RN-183: as mensagens ficam 90 dias depois do fim do prazo", () => {
    const astra = { situacao: "PUBLICADO" as const, expiraEm: FIM_DO_ASTRA, criadoEm }
    expect(mensagensAte(astra)?.toISOString()).toBe("2027-02-16T17:26:00.000Z")
    expect(mensagensVencidas(astra, new Date("2027-02-16T17:25:00Z"))).toBe(false)
    expect(mensagensVencidas(astra, new Date("2027-02-16T17:26:00Z"))).toBe(true)
    // RN-17: o que nunca foi ao ar não recebe mensagem, então não tem prazo para elas.
    expect(mensagensAte({ situacao: "AGUARDANDO_PAGAMENTO", expiraEm: null, criadoEm })).toBeNull()
  })

  it("RF-182: os cortes da rodada são 90 e 180 dias atrás, e o aviso pega quem é apagado nos próximos 7 dias", () => {
    const cortes = cortesDaRodada(RODADA)
    expect(cortes.mensagensVencidasAte).toEqual(venceuHa(90))
    expect(cortes.vencidosAte).toEqual(venceuHa(180))
    expect(cortes.criadosAte).toEqual(venceuHa(180))
    expect(cortes.avisarVencidosAte).toEqual(venceuHa(173))
  })
})

describe("Carta do aviso antes de apagar (RF-183) e do vencimento (RF-185)", () => {
  const carta = montarAvisoDeApagar({
    dono: { nome: "Álvaro Pereira Gomes" },
    anuncio: { codigo: "4DPUMX", titulo: "Astra Sedan Expression 2002", expiraEm: FIM_DO_ASTRA },
    linkParaRenovar: "https://classificados.teste/minha-conta/anuncios/a1",
  })

  it("RF-183: diz até quando fica guardado, que depois é apagado de vez e leva o botão de renovar", () => {
    expect(carta.assunto).toBe('Seu anúncio "Astra Sedan Expression 2002" fica guardado até 17/05/2027')
    expect(carta.saudacao).toBe("Olá, Álvaro.")
    expect(carta.paragrafos[0]).toBe(
      'Seu anúncio "Astra Sedan Expression 2002" (código 4DPUMX) saiu do caderno em 18/11/2026 e está guardado em Minha conta, em Expirados.',
    )
    expect(carta.paragrafos[1]).toContain("Depois de 17/05/2027, ele é apagado de vez, com o texto e as fotos")
    expect(carta.paragrafos[2]).toContain("volta ao caderno com o mesmo texto e as mesmas fotos")
    expect(carta.botao).toEqual({ rotulo: "Renovar o anúncio", url: "https://classificados.teste/minha-conta/anuncios/a1" })
    expect(carta.observacoes.join(" ")).toContain("não pede pagamento por mensagem, e-mail ou telefone")
    expect(carta.responderPara).toBeNull()
  })

  it("RF-185: o e-mail do vencimento conta que o vencido fica guardado 180 dias e as mensagens 90", () => {
    const vencimento = montarAvisoDeVencimento({
      dono: { nome: "Álvaro" },
      anuncio: { codigo: "4DPUMX", titulo: "Astra", expiraEm: FIM_DO_ASTRA, visualizacoes: 0 },
      agora: new Date("2026-11-17T12:00:00Z"),
      linkParaRenovar: "https://classificados.teste/r",
      linkDoAnuncio: "https://classificados.teste/a",
      linkDoResultado: "https://classificados.teste/f",
    })
    expect(vencimento.observacoes.join(" ")).toContain("fica guardado em Minha conta por 180 dias, para renovar sem reescrever")
    expect(vencimento.observacoes.join(" ")).toContain("As mensagens ficam para leitura por 90 dias")
  })
})

function rodada() {
  const relogio = new RelogioFixo(RODADA)
  const guarda = new GuardaEmMemoria()
  const pagamentos = new PagamentosEmMemoria(new AnunciosEmMemoria())
  const gateway = new GatewayFalso()
  const fotosApagadas: string[] = []
  const storage = { ...storageFalso, remover: async (ids: string[]) => void fotosApagadas.push(...ids) }
  const apagar = new ApagarVencidosUseCase(guarda, pagamentos, gateway, storage, relogio)
  return { relogio, guarda, pagamentos, gateway, fotosApagadas, apagar }
}

function pendente(anuncioId: string, extra: Partial<PagamentoRegistro> = {}): Omit<PagamentoRegistro, "id"> {
  return {
    codigo: `PG${anuncioId.toUpperCase()}`.padEnd(10, "X").slice(0, 10),
    anuncioId,
    usuarioId: "dono",
    planoCodigo: "SIMPLES",
    valorCentavos: 100,
    dias: 7,
    situacao: "PENDENTE",
    gateway: null,
    gatewayId: null,
    copiaECola: null,
    vencimentoEm: null,
    criadoEm: venceuHa(1),
    confirmadoEm: null,
    confirmadoPorId: null,
    ...extra,
  }
}

describe("Rodada dos vencidos: mensagens (RF-182, RN-183)", () => {
  it("RN-183: apaga as mensagens do vencido há 91 dias e não mexe nas do vencido há 89 nem nas do anúncio no ar", async () => {
    const t = rodada()
    t.guarda.adicionar({ id: "v91", expiraEm: venceuHa(91) }, { mensagens: 3 })
    t.guarda.adicionar({ id: "v89", expiraEm: venceuHa(89) }, { mensagens: 2 })
    t.guarda.adicionar({ id: "desat", situacao: "DESATIVADO", expiraEm: venceuHa(120) }, { mensagens: 1 })
    t.guarda.adicionar({ id: "noar", expiraEm: new Date(RODADA.getTime() + 5 * DIA) }, { mensagens: 4 })
    const resumo = await t.apagar.executar()
    expect(resumo.mensagensApagadas).toBe(4)
    expect(t.guarda.mensagens.map((m) => m.anuncioId).sort()).toEqual(["noar", "noar", "noar", "noar", "v89", "v89"])
    // A situação não muda: o anúncio continua em Expirados até os 180 dias.
    expect(t.guarda.buscar("v91").situacao).toBe("PUBLICADO")
  })
})

describe("Rodada dos vencidos: anúncios (RF-182, RN-182, RN-184 a RN-189)", () => {
  it("RN-182 e RN-185: apaga o vencido há 181 dias com fotos, mensagens e visitas por pessoa; o de 179 fica", async () => {
    const t = rodada()
    t.guarda.adicionar({ id: "v181", expiraEm: venceuHa(181) }, { mensagens: 2, fotos: 3, visitas: 5 })
    t.guarda.adicionar({ id: "v179", expiraEm: venceuHa(179) }, { fotos: 1 })
    const resumo = await t.apagar.executar()

    expect(resumo).toMatchObject({ encontrados: 1, apagados: 1, adiados: 0, falhas: 0, fotosApagadas: 3 })
    const apagado = t.guarda.buscar("v181")
    expect(apagado).toMatchObject({ situacao: "APAGADO", apagadoEm: RODADA, titulo: "" })
    // O código fica: um cartaz antigo nunca abre o anúncio de outra pessoa (ADR-24).
    expect(apagado.codigo).toBe("V181XX")
    expect(t.guarda.mensagens.filter((m) => m.anuncioId === "v181")).toHaveLength(0)
    expect(t.guarda.visitas.filter((v) => v.anuncioId === "v181")).toHaveLength(0)
    // RN-185: as fotos saem do Cloudinary também.
    expect(t.fotosApagadas).toEqual(["teste/anuncios/v181/foto-1", "teste/anuncios/v181/foto-2", "teste/anuncios/v181/foto-3"])
    expect(t.guarda.buscar("v179").situacao).toBe("PUBLICADO")
    expect(t.guarda.fotos.filter((f) => f.anuncioId === "v179")).toHaveLength(1)
  })

  it("RN-182: o desativado vencido conta igual ao publicado", async () => {
    const t = rodada()
    t.guarda.adicionar({ id: "desat", situacao: "DESATIVADO", expiraEm: venceuHa(200) })
    await t.apagar.executar()
    expect(t.guarda.buscar("desat").situacao).toBe("APAGADO")
  })

  it("RN-184: apaga o nunca publicado criado há 181 dias; o criado há 179 fica", async () => {
    const t = rodada()
    t.guarda.adicionar({ id: "velho", situacao: "AGUARDANDO_PAGAMENTO", criadoEm: venceuHa(181) })
    t.guarda.adicionar({ id: "novo", situacao: "AGUARDANDO_PAGAMENTO", criadoEm: venceuHa(179) })
    await t.apagar.executar()
    expect(t.guarda.buscar("velho").situacao).toBe("APAGADO")
    expect(t.guarda.buscar("novo").situacao).toBe("AGUARDANDO_PAGAMENTO")
  })

  it("RN-188: o removido não entra na limpeza, nem o já apagado", async () => {
    const t = rodada()
    t.guarda.adicionar({ id: "removido", situacao: "REMOVIDO", expiraEm: venceuHa(400), criadoEm: venceuHa(500) }, { fotos: 1 })
    t.guarda.adicionar({ id: "apagado", situacao: "APAGADO", expiraEm: venceuHa(400) })
    const resumo = await t.apagar.executar()
    expect(resumo.encontrados).toBe(0)
    expect(t.guarda.buscar("removido").situacao).toBe("REMOVIDO")
    expect(t.fotosApagadas).toEqual([])
  })

  it("RN-186: cancela a cobrança Pix em aberto, também no Mercado Pago, antes de apagar", async () => {
    const t = rodada()
    t.guarda.adicionar({ id: "v181", expiraEm: venceuHa(181) })
    const cobranca = await t.gateway.criarCobranca({ referencia: "PGV181XXXX", valorCentavos: 100, vencimentoEm: RODADA })
    const pagamentoId = await t.pagamentos.inserir(pendente("v181", { gateway: "MERCADO_PAGO", gatewayId: cobranca.gatewayId }))
    await t.apagar.executar()
    expect(t.guarda.buscar("v181").situacao).toBe("APAGADO")
    expect((await t.pagamentos.buscarPorId(pagamentoId))?.situacao).toBe("CANCELADO")
    expect(t.gateway.canceladas).toEqual([cobranca.gatewayId])
  })

  it("RN-186: com o Pix já pago, o anúncio não é apagado nessa rodada e a cobrança continua para a confirmação", async () => {
    const t = rodada()
    t.guarda.adicionar({ id: "v181", expiraEm: venceuHa(181) }, { fotos: 1 })
    const cobranca = await t.gateway.criarCobranca({ referencia: "PGV181XXXX", valorCentavos: 100, vencimentoEm: RODADA })
    t.gateway.pagar(cobranca.gatewayId)
    const pagamentoId = await t.pagamentos.inserir(pendente("v181", { gateway: "MERCADO_PAGO", gatewayId: cobranca.gatewayId }))
    const resumo = await t.apagar.executar()
    expect(resumo).toMatchObject({ apagados: 0, adiados: 1 })
    expect(t.guarda.buscar("v181").situacao).toBe("PUBLICADO")
    expect((await t.pagamentos.buscarPorId(pagamentoId))?.situacao).toBe("PENDENTE")
    expect(t.fotosApagadas).toEqual([])
  })

  it("ADR-24: o anúncio renovado entre a busca e a gravação fica como está", async () => {
    const t = rodada()
    t.guarda.adicionar({ id: "v181", expiraEm: venceuHa(181) }, { mensagens: 1, fotos: 2 })
    t.guarda.renovarAntesDeApagar.set("v181", new Date(RODADA.getTime() + 7 * DIA))
    const resumo = await t.apagar.executar()
    expect(resumo).toMatchObject({ apagados: 0, adiados: 1 })
    expect(t.guarda.buscar("v181").situacao).toBe("PUBLICADO")
    expect(t.guarda.fotos).toHaveLength(2)
    expect(t.fotosApagadas).toEqual([])
  })

  it("RN-189: no máximo 100 anúncios por rodada; os outros ficam para o dia seguinte", async () => {
    const t = rodada()
    for (let i = 0; i < APAGADOS_POR_RODADA + 5; i++) t.guarda.adicionar({ id: `v${i}`, expiraEm: venceuHa(181 + i) })
    expect((await t.apagar.executar()).apagados).toBe(100)
    t.relogio.avancarDias(1)
    expect((await t.apagar.executar()).apagados).toBe(5)
  })

  it("um anúncio com problema não para a rodada", async () => {
    const t = rodada()
    t.guarda.adicionar({ id: "ruim", expiraEm: venceuHa(190) })
    t.guarda.adicionar({ id: "bom", expiraEm: venceuHa(185) })
    const apagarOriginal = t.guarda.apagar.bind(t.guarda)
    t.guarda.apagar = async (id, cortes, quando) => {
      if (id === "ruim") throw new Error("banco fora do ar")
      return apagarOriginal(id, cortes, quando)
    }
    const resumo = await t.apagar.executar()
    expect(resumo).toMatchObject({ encontrados: 2, apagados: 1, falhas: 1 })
    expect(t.guarda.buscar("bom").situacao).toBe("APAGADO")
  })
})

describe("Aviso 7 dias antes de apagar (RF-183, RN-187)", () => {
  function avisos() {
    const relogio = new RelogioFixo(RODADA)
    const guarda = new GuardaEmMemoria()
    const correio = new CorreioFalso()
    return { relogio, guarda, correio, avisar: new AvisarAntesDeApagarUseCase(guarda, correio, relogio, enderecosDeTeste) }
  }

  it("RF-183: avisa quem é apagado nos próximos 7 dias, com o link do anúncio em Minha conta", async () => {
    const t = avisos()
    t.guarda.adicionar({ id: "v174", titulo: "Astra Sedan Expression 2002", expiraEm: venceuHa(174) })
    t.guarda.adicionar({ id: "v172", expiraEm: venceuHa(172) })
    // Já passou dos 180: é da limpeza, não do aviso.
    t.guarda.adicionar({ id: "v181", expiraEm: venceuHa(181) })
    t.guarda.adicionar({ id: "noar", expiraEm: new Date(RODADA.getTime() + DIA) })
    const resumo = await t.avisar.executar()
    expect(resumo).toEqual({ ligado: true, encontrados: 1, enviados: 1, ignorados: 0, falhas: 0 })
    expect(t.correio.enviadas[0].para).toEqual({ nome: "Álvaro Federal", email: "dono@exemplo.com.br" })
    expect(t.correio.enviadas[0].carta.assunto).toContain('"Astra Sedan Expression 2002" fica guardado até')
    expect(t.correio.enviadas[0].carta.botao?.url).toBe("https://classificados.teste/minha-conta/anuncios/v174")
  })

  it("RN-187: rodar de novo não manda outro e-mail para o mesmo vencimento", async () => {
    const t = avisos()
    t.guarda.adicionar({ id: "v174", expiraEm: venceuHa(174) })
    await t.avisar.executar()
    t.relogio.avancarDias(1)
    const segunda = await t.avisar.executar()
    expect(segunda.encontrados).toBe(0)
    expect(t.correio.enviadas).toHaveLength(1)
  })

  it("RN-187: outra rodada que marcou primeiro fica com o envio", async () => {
    const t = avisos()
    t.guarda.adicionar({ id: "v174", expiraEm: venceuHa(174) })
    t.guarda.outraRodadaMarcou.add("v174")
    const resumo = await t.avisar.executar()
    expect(resumo.enviados).toBe(0)
    expect(t.correio.enviadas).toHaveLength(0)
  })

  it("RN-187: renovado e vencido de novo, o anúncio ganha o aviso do vencimento novo", async () => {
    const t = avisos()
    // Avisado no vencimento anterior, um ano antes.
    t.guarda.adicionar({ id: "v174", expiraEm: venceuHa(174), avisadoPara: venceuHa(540) })
    expect((await t.avisar.executar()).enviados).toBe(1)
  })

  it("RN-187 e RN-122: conta desativada e e-mail de teste ficam marcados, sem envio", async () => {
    const t = avisos()
    t.guarda.adicionar({ id: "desativada", expiraEm: venceuHa(174), dono: { nome: "Ana", email: "ana@exemplo.com.br", ativo: false } })
    t.guarda.adicionar({ id: "teste", expiraEm: venceuHa(175), dono: { nome: "Bia", email: "bia@cdb.test", ativo: true } })
    const resumo = await t.avisar.executar()
    expect(resumo).toMatchObject({ encontrados: 2, enviados: 0, ignorados: 2 })
    expect(t.guarda.buscar("desativada").avisadoPara).toEqual(venceuHa(174))
    expect((await t.avisar.executar()).encontrados).toBe(0)
  })

  it("RN-187: sem servidor de e-mail nada é enviado nem marcado", async () => {
    const t = avisos()
    t.correio.ligado = false
    t.guarda.adicionar({ id: "v174", expiraEm: venceuHa(174) })
    expect(await t.avisar.executar()).toEqual({ ligado: false, encontrados: 0, enviados: 0, ignorados: 0, falhas: 0 })
    expect(t.guarda.buscar("v174").avisadoPara).toBeNull()
  })

  it("RN-187: falha no envio desfaz a marca, e o anúncio volta na rodada seguinte", async () => {
    const t = avisos()
    t.guarda.adicionar({ id: "v174", expiraEm: venceuHa(174) })
    t.correio.falhar = true
    expect((await t.avisar.executar()).falhas).toBe(1)
    expect(t.guarda.buscar("v174").avisadoPara).toBeNull()
    t.correio.falhar = false
    expect((await t.avisar.executar()).enviados).toBe(1)
  })
})

describe("O anúncio apagado não volta (RN-189)", () => {
  const DONO = { usuarioId: "dono", perfil: "ANUNCIANTE" as const }
  const ADMIN = { usuarioId: "admin", perfil: "ADMIN" as const }

  async function comApagado() {
    const c = caderno()
    const id = await c.anuncios.inserir({
      codigo: "AP4GAD",
      usuarioId: "dono",
      categoriaId: "cat-veiculos",
      uf: "DF",
      cidadeCodigo: 5300108,
      titulo: "",
      texto: "",
      precoCentavos: null,
      estilo: ESTILO_PADRAO,
      situacao: "APAGADO",
      planoCodigo: "SIMPLES",
      prioridade: 0,
      publicadoEm: venceuHa(400),
      expiraEm: venceuHa(390),
    })
    return { ...c, id }
  }

  it("RN-189: a tela mostra Apagado, e não se ativa, desativa nem pergunta o \"Fechou negócio?\"", async () => {
    const t = await comApagado()
    const anuncio = (await t.anuncios.buscarPorId(t.id))!
    expect(situacaoExibida(anuncio.situacao, anuncio.expiraEm, RODADA)).toBe("APAGADO")
    expect(podePerguntarResultado(anuncio)).toBe(false)
    const ativar = new AtivarOuDesativarAnuncioUseCase(t.anuncios, t.relogio)
    expect((await ativar.ativar(DONO, t.id)).ok).toBe(false)
    expect((await ativar.desativar(DONO, t.id)).ok).toBe(false)
  })

  it("RN-189: não se edita, nem pelo administrador", async () => {
    const t = await comApagado()
    const editar = new EditarAnuncioUseCase(t.anuncios, t.categorias, localidades)
    const conteudo = { categoriaId: "cat-veiculos", uf: "DF", cidadeCodigo: 5300108, titulo: "Vendo Gol", texto: "Completo e revisado.", precoCentavos: null, estilo: ESTILO_PADRAO }
    expect(await editar.executar(DONO, t.id, conteudo)).toMatchObject({ ok: false, codigo: "NAO_ENCONTRADO" })
    expect(await editar.executar(ADMIN, t.id, conteudo)).toMatchObject({ ok: false, codigo: "NAO_ENCONTRADO" })
  })

  it("RN-189: não se renova pelo Pix nem pelo banco de dias, e a cortesia é recusada", async () => {
    const t = await comApagado()
    const renovar = new SolicitarRenovacaoUseCase(t.anuncios, t.depsDePagamento)
    expect(await renovar.executar({ usuarioId: "dono", email: "dono@exemplo.com.br", anuncioId: t.id, planoCodigo: "SIMPLES", dias: 7 })).toMatchObject({
      ok: false,
      codigo: "ANUNCIO_APAGADO",
    })
    const anuncio = (await t.anuncios.buscarPorId(t.id))!
    expect(conferirUsoDoBanco({ tipo: "SIMPLES", dias: 7 }, anuncio, { SIMPLES: 14, FOTOS: 0 }, RODADA)).toEqual({ planoCodigo: "Este anúncio foi apagado." })
    const confirmar = new ConfirmarPagamentoUseCase(t.anuncios, t.pagamentos, t.relogio)
    const cortesia = new PublicarCortesiaUseCase(t.anuncios, t.depsDePagamento, confirmar)
    expect(await cortesia.executar({ adminId: "admin", anuncioId: t.id, planoCodigo: "SIMPLES", dias: 7 })).toMatchObject({ ok: false, codigo: "ANUNCIO_APAGADO" })
  })

  it("RN-189: um Pix que ainda chegue não publica o apagado", async () => {
    const t = await comApagado()
    const pagamentoId = await t.pagamentos.inserir(pendente(t.id))
    const confirmar = new ConfirmarPagamentoUseCase(t.anuncios, t.pagamentos, t.relogio)
    expect(await confirmar.executar({ pagamentoId, adminId: null })).toMatchObject({ ok: false, codigo: "ANUNCIO_APAGADO" })
    expect((await t.anuncios.buscarPorId(t.id))?.situacao).toBe("APAGADO")
  })

  it("RN-189: remover não muda o apagado", async () => {
    const t = await comApagado()
    const remover = new RemoverAnuncioUseCase(t.anuncios, t.pagamentos, t.gateway)
    expect((await remover.executar(ADMIN, t.id)).ok).toBe(true)
    expect((await t.anuncios.buscarPorId(t.id))?.situacao).toBe("APAGADO")
  })
})
