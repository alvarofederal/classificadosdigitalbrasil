import { describe, expect, it } from "vitest"
import {
  ESTILO_PADRAO,
  type ConteudoDoAnuncio,
  codigoValido,
  normalizarConteudo,
  novaExpiracao,
  situacaoExibida,
  validarConteudo,
} from "@/domain/anuncio/anuncio"
import { slugDaCategoria, validarCategoria } from "@/domain/categoria/categoria"
import { contatoValido, validarMensagem } from "@/domain/mensagem/mensagem"
import { normalizarChamado, validarChamado } from "@/domain/chamado/chamado"
import { dentroDoBrasil, distanciaKm } from "@/domain/localidade/geo"
import { PERIODOS, PLANOS_INICIAIS, ehPeriodo, menorPreco, periodosDoPlano, planoTemDestaque, prioridadeDoPlano, validarPlano, valorDoPeriodo } from "@/domain/plano/plano"
import { CatalogoIbge } from "@/infrastructure/localidades/catalogo-ibge"
import { chavePixValida, crc16, gerarPixCopiaECola, textoParaPix } from "@/domain/pagamento/pix"
import { ufDe } from "@/domain/localidade/uf"
import { cpfValido, mascararCpf } from "@/domain/usuario/cpf"
import { celularValido, validarCadastro } from "@/domain/usuario/usuario"

const DIA = 86_400_000

describe("CPF (RN-02)", () => {
  it("aceita CPF com dígitos verificadores corretos, com ou sem máscara", () => {
    expect(cpfValido("529.982.247-25")).toBe(true)
    expect(cpfValido("52998224725")).toBe(true)
  })
  it("recusa dígito errado, tamanho errado e sequência repetida", () => {
    expect(cpfValido("529.982.247-24")).toBe(false)
    expect(cpfValido("5299822472")).toBe(false)
    expect(cpfValido("111.111.111-11")).toBe(false)
  })
  it("mascara para exibição", () => {
    expect(mascararCpf("52998224725")).toBe("***.982.247-**")
  })
})

describe("Cadastro (RF-01)", () => {
  const valido = {
    nome: "Maria Souza",
    cpf: "52998224725",
    email: "maria@exemplo.com",
    celular: "61999998888",
    uf: "DF",
    cidadeCodigo: 5300108,
    senha: "senha-forte",
    confirmacaoSenha: "senha-forte",
    aceitouTermos: true,
  }
  it("passa com dados completos", () => {
    expect(validarCadastro(valido)).toEqual({})
  })
  it("aponta cada campo com problema", () => {
    const erros = validarCadastro({ ...valido, nome: "Maria", cpf: "123", celular: "999", senha: "curta", confirmacaoSenha: "curta", aceitouTermos: false })
    expect(Object.keys(erros).sort()).toEqual(["aceitouTermos", "celular", "cpf", "nome", "senha"])
  })
  it("confere a confirmação da senha", () => {
    expect(validarCadastro({ ...valido, confirmacaoSenha: "outra-senha" }).confirmacaoSenha).toBeDefined()
  })
  it("celular precisa de DDD", () => {
    expect(celularValido("(61) 99999-8888")).toBe(true)
    expect(celularValido("99999-8888")).toBe(false)
  })
})

describe("Anúncio (RN-10 a RN-13)", () => {
  const conteudo: ConteudoDoAnuncio = {
    categoriaId: "cat1",
    uf: "df",
    cidadeCodigo: 5300108,
    titulo: "  Vendo   Gol 2010 ",
    texto: "Completo, revisado.\r\n\r\n\r\n\r\nIPVA pago.",
    precoCentavos: 2_200_000,
    estilo: ESTILO_PADRAO,
  }

  it("normaliza espaços, UF e linhas em branco", () => {
    const n = normalizarConteudo(conteudo)
    expect(n.titulo).toBe("Vendo Gol 2010")
    expect(n.uf).toBe("DF")
    expect(n.texto).toBe("Completo, revisado.\n\nIPVA pago.")
    expect(validarConteudo(n)).toEqual({})
  })

  it("recusa título longo, texto curto, preço zero e estilo desconhecido", () => {
    const erros = validarConteudo({
      ...normalizarConteudo(conteudo),
      titulo: "X".repeat(41),
      texto: "curto",
      precoCentavos: 0,
      estilo: { ...ESTILO_PADRAO, moldura: "NEON" as never },
    })
    expect(Object.keys(erros).sort()).toEqual(["moldura", "preco", "texto", "titulo"])
  })

  it("situação exibida depende da data de expiração", () => {
    const agora = new Date("2026-11-08T12:00:00Z")
    expect(situacaoExibida("PUBLICADO", new Date(agora.getTime() + DIA), agora)).toBe("NO_AR")
    expect(situacaoExibida("PUBLICADO", new Date(agora.getTime() - 1), agora)).toBe("EXPIRADO")
    expect(situacaoExibida("AGUARDANDO_PAGAMENTO", null, agora)).toBe("AGUARDANDO_PAGAMENTO")
    expect(situacaoExibida("REMOVIDO", new Date(agora.getTime() + DIA), agora)).toBe("REMOVIDO")
  })

  it("RN-12: pagar de novo soma dias ao que resta; expirado conta de agora", () => {
    const agora = new Date("2026-11-08T12:00:00Z")
    const aindaNoAr = new Date(agora.getTime() + 3 * DIA)
    expect(novaExpiracao(aindaNoAr, agora, 7).getTime()).toBe(agora.getTime() + 10 * DIA)
    expect(novaExpiracao(new Date(agora.getTime() - DIA), agora, 7).getTime()).toBe(agora.getTime() + 7 * DIA)
    expect(novaExpiracao(null, agora, 7).getTime()).toBe(agora.getTime() + 7 * DIA)
  })

  it("código público tem 6 caracteres sem ambíguos", () => {
    expect(codigoValido("K7XP2M")).toBe(true)
    expect(codigoValido("K7XP2O")).toBe(false)
    expect(codigoValido("k7xp2m")).toBe(false)
  })
})

describe("Pix copia e cola (ADR-07)", () => {
  it("CRC16-CCITT-FALSE confere com o valor de referência", () => {
    expect(crc16("123456789")).toBe("29B1")
  })

  it("monta o BR Code com valor, recebedor e identificador, e o CRC fecha", () => {
    const codigo = gerarPixCopiaECola({ chave: "52998224725", nomeRecebedor: "Álvaro Gomes", cidadeRecebedor: "Brasília", valorCentavos: 100, identificador: "ABC123XYZ9" })
    expect(codigo.startsWith("000201")).toBe(true)
    expect(codigo).toContain("0014br.gov.bcb.pix0111529982247255204000053039865404" + "1.00")
    expect(codigo).toContain("5912ALVARO GOMES6008BRASILIA")
    expect(codigo).toContain("62140510ABC123XYZ9")
    const semCrc = codigo.slice(0, -4)
    expect(semCrc.endsWith("6304")).toBe(true)
    expect(codigo.slice(-4)).toBe(crc16(semCrc))
  })

  it("aceita os formatos de chave do Banco Central", () => {
    expect(chavePixValida("52998224725")).toBe(true)
    expect(chavePixValida("12345678000199")).toBe(true)
    expect(chavePixValida("+5561999998888")).toBe(true)
    expect(chavePixValida("pix@exemplo.com")).toBe(true)
    expect(chavePixValida("123e4567-e89b-12d3-a456-426614174000")).toBe(true)
    expect(chavePixValida("61999998888x")).toBe(false)
  })

  it("nome e cidade do recebedor saem sem acento e no tamanho do padrão", () => {
    expect(textoParaPix("São João d'Aliança", 15)).toBe("SAO JOAO D ALIA")
  })

})

describe("Planos e tabela de preços (features 003 e 009)", () => {
  it("tabela decidida em 2026-11-09: Simples R$ 1 / 7 dias e R$ 25 / 30 dias, sem 1 dia (RN-56)", () => {
    const simples = PLANOS_INICIAIS.find((p) => p.codigo === "SIMPLES")!
    const foto = PLANOS_INICIAIS.find((p) => p.codigo === "FOTOS")!
    expect(simples.precos).toEqual({ 7: 100, 10: 400, 15: 950, 20: 1450, 30: 2500 })
    expect(foto.precos).toEqual({ 7: 1000, 10: 4000, 15: 9500, 20: 14500, 30: 25000 })
    expect(simples.maxFotos).toBe(0)
    expect(foto.maxFotos).toBe(6)
    expect(PLANOS_INICIAIS.filter((p) => p.ativo).map((p) => p.codigo)).toEqual(["SIMPLES", "FOTOS"])
  })
  it("períodos, valor do período e menor preço", () => {
    expect(PERIODOS).toEqual([7, 10, 15, 20, 30])
    expect(ehPeriodo(1)).toBe(false)
    const destaque = PLANOS_INICIAIS.find((p) => p.codigo === "DESTAQUE")!
    expect(periodosDoPlano(destaque)).toEqual([7, 30])
    expect(valorDoPeriodo(destaque, 15)).toBeNull()
    expect(menorPreco(PLANOS_INICIAIS.filter((p) => p.ativo))).toEqual({ valorCentavos: 100, dias: 7 })
  })
  it("prioridade na seção (RN-50)", () => {
    expect(prioridadeDoPlano("VITRINE")).toBeGreaterThan(prioridadeDoPlano("DESTAQUE"))
    expect(prioridadeDoPlano("DESTAQUE")).toBeGreaterThan(prioridadeDoPlano("FOTOS"))
    expect(prioridadeDoPlano("FOTOS")).toBeGreaterThan(prioridadeDoPlano("SIMPLES"))
    expect(planoTemDestaque("DESTAQUE") && planoTemDestaque("VITRINE") && !planoTemDestaque("FOTOS")).toBe(true)
  })
  it("edição do admin tem limites e exige ao menos um período", () => {
    const base = { nome: "Simples", descricao: "Texto e chat.", maxFotos: 0, precos: { 7: 100, 30: 2500 }, ativo: true }
    expect(validarPlano(base)).toEqual({})
    expect(Object.keys(validarPlano({ ...base, maxFotos: 9, precos: { 7: 0, 30: 2500 } })).sort()).toEqual(["maxFotos", "preco7"])
    expect(validarPlano({ ...base, precos: {} }).preco7).toBeDefined()
  })
})

describe("Perto de mim (feature 002)", () => {
  it("distância de Brasília a Goiânia fica perto de 175 km", () => {
    const d = distanciaKm({ latitude: -15.7795, longitude: -47.9297 }, { latitude: -16.6864, longitude: -49.2643 })
    expect(d).toBeGreaterThan(160)
    expect(d).toBeLessThan(190)
  })
  it("acha a cidade pela coordenada e recusa fora do Brasil (RN-41)", () => {
    const catalogo = new CatalogoIbge()
    expect(catalogo.cidadeMaisProxima({ latitude: -15.79, longitude: -47.88 })?.nome).toBe("Brasília")
    expect(catalogo.cidadeMaisProxima({ latitude: -23.55, longitude: -46.63 })?.nome).toBe("São Paulo")
    expect(dentroDoBrasil({ latitude: 48.85, longitude: 2.35 })).toBe(false)
  })
})

describe("Chamados (feature 004)", () => {
  const ok = { nome: "Ana Lima", email: "Ana@Exemplo.com ", telefone: "(61) 99999-8888", assunto: "denuncia", mensagem: "Este anúncio parece golpe.", anuncioCodigo: "9tttmq" }
  it("normaliza e valida", () => {
    const n = normalizarChamado(ok)
    expect(n).toMatchObject({ email: "ana@exemplo.com", telefone: "61999998888", assunto: "DENUNCIA", anuncioCodigo: "9TTTMQ" })
    expect(validarChamado(n)).toEqual({})
  })
  it("aponta e-mail, assunto, mensagem curta e código inválido", () => {
    const erros = validarChamado(normalizarChamado({ ...ok, email: "x", assunto: "nada", mensagem: "oi", anuncioCodigo: "123" }))
    expect(Object.keys(erros).sort()).toEqual(["anuncioCodigo", "assunto", "email", "mensagem"])
  })
})

describe("Mensagem (RN-17, RN-18)", () => {
  it("contato precisa permitir a resposta", () => {
    expect(contatoValido("(61) 99999-8888")).toBe(true)
    expect(contatoValido("fulano@exemplo.com")).toBe(true)
    expect(contatoValido("me chama")).toBe(false)
  })
  it("valida nome, contato e texto", () => {
    expect(validarMensagem({ nome: "Ana", contato: "61999998888", texto: "Ainda está disponível?" })).toEqual({})
    expect(Object.keys(validarMensagem({ nome: "", contato: "x", texto: "oi" })).sort()).toEqual(["contato", "nome", "texto"])
  })
})

describe("Categorias e UF", () => {
  it("slug acompanha o nome sem acento", () => {
    expect(slugDaCategoria("Música, Arte e Cultura")).toBe("musica-arte-e-cultura")
    expect(validarCategoria({ nome: "Pet", ordem: 10, ativa: true })).toEqual({})
    expect(validarCategoria({ nome: "!", ordem: -1, ativa: true }).ordem).toBeDefined()
  })
  it("UF do endereço ou do formulário", () => {
    expect(ufDe("df")).toBe("DF")
    expect(ufDe("XX")).toBeNull()
  })
})
