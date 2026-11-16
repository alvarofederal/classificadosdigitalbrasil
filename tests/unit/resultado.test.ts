// Feature 021: "Fechou negócio?" (RF-210, RF-212, RN-210 a RN-212).
import { describe, expect, it } from "vitest"
import { RegistrarResultadoUseCase } from "@/application/use-cases/anuncios/resultado"
import { ESTILO_PADRAO } from "@/domain/anuncio/anuncio"
import { RESULTADOS_DO_ANUNCIO, ehResultadoDoAnuncio, fechouNegocio, podePerguntarResultado } from "@/domain/anuncio/resultado"
import { caderno } from "../fakes"

function montar(dados: { publicadoEm?: Date | null; situacao?: "AGUARDANDO_PAGAMENTO" | "PUBLICADO" | "DESATIVADO" | "REMOVIDO" } = {}) {
  const c = caderno()
  const anuncio = {
    id: "anuncio-1",
    codigo: "ABC234",
    usuarioId: "dono-1",
    categoriaId: "cat-veiculos",
    uf: "DF",
    cidadeCodigo: 5300108,
    titulo: "Bicicleta aro 29",
    texto: "Pouco uso.",
    precoCentavos: 90_000,
    estilo: ESTILO_PADRAO,
    situacao: dados.situacao ?? ("PUBLICADO" as const),
    planoCodigo: "SIMPLES" as const,
    prioridade: 0,
    publicadoEm: dados.publicadoEm === undefined ? c.relogio.agora() : dados.publicadoEm,
    expiraEm: new Date(c.relogio.agora().getTime() + 7 * 86_400_000),
  }
  c.anuncios.itens.set(anuncio.id, anuncio)
  return { ...c, anuncio, registrar: new RegistrarResultadoUseCase(c.anuncios, c.relogio) }
}

describe("Fechou negócio? (feature 021)", () => {
  it("o catálogo tem as três respostas, e 'fechou' vale para os dois sins (RF-210, RF-212)", () => {
    expect(Object.values(RESULTADOS_DO_ANUNCIO)).toEqual(["Sim, pelo Classificados", "Sim, por outro lugar", "Ainda não"])
    expect(ehResultadoDoAnuncio("PELO_CLASSIFICADOS")).toBe(true)
    expect(ehResultadoDoAnuncio("toString")).toBe(false)
    expect(fechouNegocio("PELO_CLASSIFICADOS") && fechouNegocio("POR_OUTRO_LUGAR")).toBe(true)
    expect(fechouNegocio("AINDA_NAO") || fechouNegocio(null)).toBe(false)
  })

  it("RN-210: só pergunta sobre anúncio que já esteve no caderno e não foi removido", () => {
    const agora = new Date()
    expect(podePerguntarResultado({ publicadoEm: agora, situacao: "PUBLICADO" })).toBe(true)
    expect(podePerguntarResultado({ publicadoEm: agora, situacao: "DESATIVADO" })).toBe(true)
    expect(podePerguntarResultado({ publicadoEm: null, situacao: "AGUARDANDO_PAGAMENTO" })).toBe(false)
    expect(podePerguntarResultado({ publicadoEm: agora, situacao: "REMOVIDO" })).toBe(false)
  })

  it("RN-211: o dono responde, vale a última resposta, com a data; RN-212: a situação não muda", async () => {
    const t = montar()
    expect((await t.registrar.executar({ usuarioId: "dono-1", anuncioId: "anuncio-1", resultado: "AINDA_NAO" })).ok).toBe(true)
    t.relogio.avancarDias(3)
    const r = await t.registrar.executar({ usuarioId: "dono-1", anuncioId: "anuncio-1", resultado: "PELO_CLASSIFICADOS" })
    expect(r.ok && r.valor).toBe("PELO_CLASSIFICADOS")
    expect(t.anuncios.resultados.get("anuncio-1")).toEqual({ resultado: "PELO_CLASSIFICADOS", quando: t.relogio.agora() })
    expect((await t.anuncios.buscarPorId("anuncio-1"))?.situacao).toBe("PUBLICADO")
  })

  it("outra pessoa, anúncio que nunca foi ao ar e resposta desconhecida são recusados", async () => {
    const t = montar()
    const alheio = await t.registrar.executar({ usuarioId: "outra-pessoa", anuncioId: "anuncio-1", resultado: "AINDA_NAO" })
    expect(!alheio.ok && alheio.codigo).toBe("NAO_ENCONTRADO")
    const invalido = await t.registrar.executar({ usuarioId: "dono-1", anuncioId: "anuncio-1", resultado: "TALVEZ" })
    expect(!invalido.ok && invalido.campos?.resultado).toBeTruthy()

    const novo = montar({ publicadoEm: null, situacao: "AGUARDANDO_PAGAMENTO" })
    const semIr = await novo.registrar.executar({ usuarioId: "dono-1", anuncioId: "anuncio-1", resultado: "AINDA_NAO" })
    expect(!semIr.ok && semIr.codigo).toBe("SEM_RESULTADO")
    expect(novo.anuncios.resultados.size).toBe(0)
  })
})
