// Feature 010 — aviso de mensagem por e-mail: domínio, casos de uso, modelo do e-mail e adaptador SMTP.
import { describe, expect, it } from "vitest"
import { EnviarEmailDeTesteUseCase } from "@/application/use-cases/admin/administracao"
import { CriarAnuncioUseCase } from "@/application/use-cases/anuncios/gerenciar-anuncios"
import { AvisarMensagemNovaUseCase, EnviarMensagemUseCase } from "@/application/use-cases/anuncios/mensagens"
import { ConfirmarPagamentoUseCase } from "@/application/use-cases/pagamentos/pagamentos"
import { ESTILO_PADRAO } from "@/domain/anuncio/anuncio"
import { AVISOS_POR_ANUNCIO_POR_DIA, deveAvisar, emailParaResposta, linkDoWhatsApp, montarAvisoDeMensagemNova, montarEmailDeTeste } from "@/domain/mensagem/aviso"
import { CorreioDesligado, CorreioSmtp, type ConfiguracaoSmtp, type MensagemDeEmail, type TransporteDeEmail, lerConfiguracaoSmtp } from "@/infrastructure/email/correio-smtp"
import { cartaEmHtml, cartaEmTexto, emUmaLinha, escaparHtml } from "@/infrastructure/email/modelo"
import { DepoisDaResposta } from "@/infrastructure/segundo-plano"
import { caderno, enderecosDeTeste, localidades } from "../fakes"

const DONO = { id: "dono-1", nome: "Álvaro Federal", email: "dono@exemplo.com", cpf: "52998224725", celular: "61988887777" }
const VISITANTE = { nome: "Maria Souza", contato: "(61) 99999-0000", texto: "Ainda está disponível?\nPosso ver no sábado?" }
const conteudo = {
  categoriaId: "cat-veiculos",
  uf: "DF",
  cidadeCodigo: 5300108,
  titulo: "Vendo Gol 2010",
  texto: "Completo, revisado, IPVA pago.",
  precoCentavos: 2_200_000,
  estilo: ESTILO_PADRAO,
}

function montar() {
  const c = caderno()
  c.usuarios.itens.set(DONO.id, {
    id: DONO.id,
    nome: DONO.nome,
    cpf: DONO.cpf,
    email: DONO.email,
    celular: DONO.celular,
    uf: "DF",
    cidadeCodigo: 5300108,
    senhaHash: "hash:segredo",
    perfil: "ANUNCIANTE",
    ativo: true,
    deveTrocarSenha: false,
    aceitouTermosEm: null,
  })
  const avisar = new AvisarMensagemNovaUseCase(c.usuarios, c.mensagens, c.correio, c.relogio, enderecosDeTeste)
  return {
    ...c,
    avisar,
    criar: new CriarAnuncioUseCase(c.anuncios, c.categorias, localidades, c.codigos, c.depsDePagamento),
    confirmar: new ConfirmarPagamentoUseCase(c.anuncios, c.pagamentos, c.relogio),
    mensagem: new EnviarMensagemUseCase(c.anuncios, c.mensagens, c.relogio, avisar, c.segundoPlano),
  }
}

async function anuncioNoAr(t: ReturnType<typeof montar>) {
  const r = await t.criar.executar({ id: DONO.id, email: DONO.email }, { ...conteudo, planoCodigo: "SIMPLES", dias: 7 })
  if (!r.ok) throw new Error(r.mensagem)
  const pendente = (await t.pagamentos.pendenteDoAnuncio(r.valor.anuncioId))!
  const confirmado = await t.confirmar.executar({ pagamentoId: pendente.id, adminId: "admin" })
  if (!confirmado.ok) throw new Error(confirmado.mensagem)
  return r.valor
}

const dadosDaCarta = {
  dono: { nome: DONO.nome },
  anuncio: { codigo: "ABC123", titulo: "Vendo Gol 2010" },
  mensagem: VISITANTE,
  linkDasMensagens: "https://classificados.teste/minha-conta/anuncios/a1#titulo-mensagens",
  recebidasNoDia: 1,
}

describe("Carta do aviso (RF-100, RF-101, RN-102, RN-103, RN-105)", () => {
  it("RF-100: leva anúncio, quem escreveu, o texto, o contato e o link para Minha conta", () => {
    const carta = montarAvisoDeMensagemNova(dadosDaCarta)
    expect(carta.assunto).toBe('Nova mensagem no seu anúncio "Vendo Gol 2010"')
    expect(carta.saudacao).toBe("Olá, Álvaro.")
    expect(carta.paragrafos[0]).toContain("Maria Souza escreveu")
    expect(carta.paragrafos[0]).toContain("código ABC123")
    expect(carta.citacao).toEqual({ autor: "Maria Souza", texto: VISITANTE.texto })
    expect(carta.linhas[0]).toMatchObject({ rotulo: "Responder para", valor: "(61) 99999-0000" })
    expect(carta.botao?.url).toBe(dadosDaCarta.linkDasMensagens)
  })

  it("RF-101: telefone ganha o link do WhatsApp e não tem endereço de resposta", () => {
    const carta = montarAvisoDeMensagemNova(dadosDaCarta)
    expect(carta.linhas[1]).toMatchObject({ rotulo: "WhatsApp", link: "https://wa.me/5561999990000" })
    expect(carta.responderPara).toBeNull()
    expect(carta.observacoes[0]).toContain("responda pelo contato acima")
  })

  it("RF-101: e-mail vira o endereço de resposta do aviso", () => {
    const carta = montarAvisoDeMensagemNova({ ...dadosDaCarta, mensagem: { ...VISITANTE, contato: "maria@exemplo.com" } })
    expect(carta.responderPara).toEqual({ nome: "Maria Souza", email: "maria@exemplo.com" })
    expect(carta.linhas).toEqual([{ rotulo: "Responder para", valor: "maria@exemplo.com", link: "mailto:maria@exemplo.com" }])
    expect(carta.observacoes[0]).toContain("direto para Maria Souza")
  })

  it("RN-103: e-mail com sinais que mudam o destinatário não vira endereço de resposta", () => {
    for (const estranho of ['a"b<c>@x.com', "vitima@banco.com,atacante@x.com", "a(b)@x.com", "a;b@x.com", "a@b"]) {
      expect(emailParaResposta(estranho)).toBeNull()
    }
    expect(emailParaResposta(" maria.souza+olx@exemplo.com.br ")).toBe("maria.souza+olx@exemplo.com.br")
    const carta = montarAvisoDeMensagemNova({ ...dadosDaCarta, mensagem: { ...VISITANTE, contato: 'a"b<c>@x.com' } })
    expect(carta.responderPara).toBeNull()
    expect(carta.linhas[0].link).toBeNull()
  })

  it("RF-101: o link do WhatsApp só existe para telefone brasileiro com DDD", () => {
    expect(linkDoWhatsApp("61 3333-4444")).toBe("https://wa.me/556133334444")
    expect(linkDoWhatsApp("+55 (61) 99999-0000")).toBe("https://wa.me/5561999990000")
    expect(linkDoWhatsApp("maria@exemplo.com")).toBeNull()
    expect(linkDoWhatsApp("061999990000")).toBeNull()
  })

  it("RN-105: todo aviso traz o lembrete de segurança", () => {
    expect(montarAvisoDeMensagemNova(dadosDaCarta).observacoes.join(" ")).toContain("não pede pagamento, código nem senha")
  })

  it("RN-101: o décimo aviso do dia diz que os próximos ficam só em Minha conta", () => {
    expect(deveAvisar(AVISOS_POR_ANUNCIO_POR_DIA)).toBe(true)
    expect(deveAvisar(AVISOS_POR_ANUNCIO_POR_DIA + 1)).toBe(false)
    const nono = montarAvisoDeMensagemNova({ ...dadosDaCarta, recebidasNoDia: AVISOS_POR_ANUNCIO_POR_DIA - 1 })
    const decimo = montarAvisoDeMensagemNova({ ...dadosDaCarta, recebidasNoDia: AVISOS_POR_ANUNCIO_POR_DIA })
    expect(nono.observacoes.join(" ")).not.toContain("ficam só em Minha conta")
    expect(decimo.observacoes.join(" ")).toContain("ficam só em Minha conta")
  })
})

describe("Aviso ao dono quando chega mensagem (RF-100, RF-102, RF-104, RN-100 a RN-104)", () => {
  it("RF-100 e RF-102: a mensagem é confirmada na hora e o e-mail sai depois, só para o e-mail da conta do dono", async () => {
    const t = montar()
    const { anuncioId, codigo } = await anuncioNoAr(t)

    const r = await t.mensagem.executar(anuncioId, VISITANTE)
    expect(r.ok).toBe(true)
    // RF-102: quem escreveu já tem a resposta e nada foi enviado ainda.
    expect(t.correio.enviadas).toHaveLength(0)
    expect(t.segundoPlano.pendentes).toBe(1)

    await t.segundoPlano.concluir()
    expect(t.correio.enviadas).toHaveLength(1)
    const { para, carta } = t.correio.enviadas[0]
    expect(para).toEqual({ nome: DONO.nome, email: DONO.email })
    expect(carta.paragrafos[0]).toContain(`código ${codigo}`)
    expect(carta.botao?.url).toBe(`https://classificados.teste/minha-conta/anuncios/${anuncioId}#titulo-mensagens`)
  })

  it("RN-102: CPF, celular e e-mail do dono não entram na carta", async () => {
    const t = montar()
    const { anuncioId } = await anuncioNoAr(t)
    await t.mensagem.executar(anuncioId, VISITANTE)
    await t.segundoPlano.concluir()
    const carta = JSON.stringify(t.correio.enviadas[0].carta)
    expect(carta).not.toContain(DONO.cpf)
    expect(carta).not.toContain(DONO.celular)
    expect(carta).not.toContain(DONO.email)
  })

  it("RN-100: servidor de e-mail fora do ar não derruba a mensagem", async () => {
    const t = montar()
    const { anuncioId } = await anuncioNoAr(t)
    t.correio.falhar = true

    expect((await t.mensagem.executar(anuncioId, VISITANTE)).ok).toBe(true)
    await t.segundoPlano.concluir()
    expect(t.mensagens.itens).toHaveLength(1)
    expect(t.correio.enviadas).toHaveLength(0)
  })

  it("RN-100: erro inesperado no aviso também não volta para quem escreveu", async () => {
    const t = montar()
    const { anuncioId } = await anuncioNoAr(t)
    t.correio.enviar = async () => {
      throw new Error("pane no correio")
    }
    expect((await t.mensagem.executar(anuncioId, VISITANTE)).ok).toBe(true)
    await expect(t.segundoPlano.concluir()).resolves.toBeUndefined()
    expect(t.mensagens.itens).toHaveLength(1)
  })

  it("RF-104: sem servidor de e-mail, a mensagem é gravada e nada é enviado", async () => {
    const t = montar()
    const { anuncioId } = await anuncioNoAr(t)
    t.correio.ligado = false

    expect((await t.mensagem.executar(anuncioId, VISITANTE)).ok).toBe(true)
    await t.segundoPlano.concluir()
    expect(t.mensagens.itens).toHaveLength(1)
    expect(t.correio.enviadas).toHaveLength(0)
  })

  it("RN-101: no máximo 10 avisos por anúncio em 24 horas; passado o prazo, volta a avisar", async () => {
    const t = montar()
    const { anuncioId } = await anuncioNoAr(t)
    // Doze pessoas diferentes (a RN-18 limita cada contato a 3 mensagens).
    for (let i = 0; i < 12; i++) {
      const r = await t.mensagem.executar(anuncioId, { ...VISITANTE, contato: `pessoa${i}@exemplo.com` })
      expect(r.ok).toBe(true)
      await t.segundoPlano.concluir()
    }
    expect(t.mensagens.itens).toHaveLength(12)
    expect(t.correio.enviadas).toHaveLength(AVISOS_POR_ANUNCIO_POR_DIA)
    expect(t.correio.enviadas[9].carta.observacoes.join(" ")).toContain("ficam só em Minha conta")

    t.relogio.avancarDias(2)
    await t.mensagem.executar(anuncioId, { ...VISITANTE, contato: "depois@exemplo.com" })
    await t.segundoPlano.concluir()
    expect(t.correio.enviadas).toHaveLength(AVISOS_POR_ANUNCIO_POR_DIA + 1)
  })

  it("RN-104: dono com a conta desativada não recebe aviso", async () => {
    const t = montar()
    const { anuncioId } = await anuncioNoAr(t)
    t.usuarios.itens.set(DONO.id, { ...t.usuarios.itens.get(DONO.id)!, ativo: false })

    await t.mensagem.executar(anuncioId, VISITANTE)
    await t.segundoPlano.concluir()
    expect(t.correio.enviadas).toHaveLength(0)
  })

  it("RN-17: mensagem recusada (anúncio fora do ar) não gera aviso", async () => {
    const t = montar()
    const r = await t.criar.executar({ id: DONO.id, email: DONO.email }, { ...conteudo, planoCodigo: "SIMPLES", dias: 7 })
    if (!r.ok) throw new Error(r.mensagem)
    expect((await t.mensagem.executar(r.valor.anuncioId, VISITANTE)).ok).toBe(false)
    expect(t.segundoPlano.pendentes).toBe(0)
  })
})

describe("E-mail de teste do painel (RF-103)", () => {
  it("manda a carta de teste para o administrador", async () => {
    const t = montar()
    const r = await new EnviarEmailDeTesteUseCase(t.correio).executar({ nome: "Álvaro Federal", email: "admin@exemplo.com" })
    expect(r.ok).toBe(true)
    expect(t.correio.enviadas[0].para.email).toBe("admin@exemplo.com")
    expect(t.correio.enviadas[0].carta).toEqual(montarEmailDeTeste("Álvaro Federal"))
  })

  it("sem servidor cadastrado, diz que falta cadastrar; servidor fora devolve o motivo", async () => {
    const t = montar()
    t.correio.ligado = false
    const semServidor = await new EnviarEmailDeTesteUseCase(t.correio).executar({ nome: "A", email: "admin@exemplo.com" })
    expect(semServidor.ok).toBe(false)
    if (!semServidor.ok) expect(semServidor.codigo).toBe("SEM_CORREIO")

    t.correio.ligado = true
    t.correio.falhar = true
    const fora = await new EnviarEmailDeTesteUseCase(t.correio).executar({ nome: "A", email: "admin@exemplo.com" })
    expect(fora.ok).toBe(false)
    if (!fora.ok) expect(fora.mensagem).toContain("fora do ar")
  })
})

describe("Modelo do e-mail (RN-103)", () => {
  const maliciosa = montarAvisoDeMensagemNova({
    ...dadosDaCarta,
    mensagem: { nome: '<img src=x onerror="alert(1)">', contato: "61999990000", texto: 'Olá <script>alert("x")</script>\n<a href="http://golpe.example">clique</a> & pague' },
  })

  it("nome e texto de quem escreveu nunca viram HTML", () => {
    const html = cartaEmHtml(maliciosa)
    expect(html).not.toContain("<script>")
    expect(html).not.toContain("<img")
    expect(html).not.toContain('<a href="http://golpe.example"')
    expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;")
    expect(html).toContain("&amp; pague")
    expect(escaparHtml(`<&>"'`)).toBe("&lt;&amp;&gt;&quot;&#39;")
  })

  it("quebras de linha do texto viram <br> e o HTML tem a manchete, o botão e o link do WhatsApp", () => {
    const html = cartaEmHtml(montarAvisoDeMensagemNova(dadosDaCarta))
    expect(html).toContain("Ainda está disponível?<br>Posso ver no sábado?")
    expect(html).toContain(">CLASSIFICADOS</td>")
    expect(html).toContain(`href="${dadosDaCarta.linkDasMensagens}"`)
    expect(html).toContain('href="https://wa.me/5561999990000"')
    expect(html).toContain('lang="pt-BR"')
  })

  it("endereço que não é https, http ou mailto aparece como texto, sem link", () => {
    const carta = { ...montarAvisoDeMensagemNova(dadosDaCarta), botao: { rotulo: "Abrir", url: "javascript:alert(1)" } }
    carta.linhas = [{ rotulo: "Contato", valor: "x", link: "data:text/html,<b>x</b>" }]
    const html = cartaEmHtml(carta)
    expect(html).not.toContain("javascript:")
    expect(html).not.toContain("data:text/html")
    expect(cartaEmTexto(carta)).not.toContain("javascript:")
  })

  it("a versão em texto puro traz a mensagem citada, o contato e os links", () => {
    const texto = cartaEmTexto(montarAvisoDeMensagemNova(dadosDaCarta))
    expect(texto).toContain("Olá, Álvaro.")
    expect(texto).toContain("Mensagem de Maria Souza:\n> Ainda está disponível?\n> Posso ver no sábado?")
    expect(texto).toContain("Responder para: (61) 99999-0000")
    expect(texto).toContain("https://wa.me/5561999990000")
    expect(texto).toContain(dadosDaCarta.linkDasMensagens)
    expect(texto).not.toContain("<")
  })

  it("assunto e nomes ficam em uma linha, sem caractere de controle", () => {
    expect(emUmaLinha("Vendo Gol\r\nBcc: alguem@x.com")).toBe("Vendo Gol Bcc: alguem@x.com")
    expect(emUmaLinha("  a\tb\u0000c  ")).toBe("a b c")
    expect(emUmaLinha("x".repeat(300), 150)).toHaveLength(150)
  })
})

describe("Correio por SMTP (ADR-15, RN-100, RN-103)", () => {
  const cfg: ConfiguracaoSmtp = { host: "smtp.exemplo.com", porta: 465, usuario: "site@exemplo.com", senha: "segredo", remetente: "site@exemplo.com" }

  function transporteFalso(comportamento: Partial<TransporteDeEmail> = {}) {
    const enviadas: MensagemDeEmail[] = []
    const transporte: TransporteDeEmail = {
      enviar: async (mensagem) => {
        enviadas.push(mensagem)
        return { messageId: "<id-1@exemplo.com>", rejected: [] }
      },
      conferir: async () => true,
      ...comportamento,
    }
    return { enviadas, transporte }
  }

  it("monta remetente, destino, assunto, texto, HTML e endereço de resposta", async () => {
    const { enviadas, transporte } = transporteFalso()
    const correio = new CorreioSmtp(cfg, "Classificados Digitais do Brasil", transporte)
    const carta = montarAvisoDeMensagemNova({ ...dadosDaCarta, mensagem: { ...VISITANTE, contato: "maria@exemplo.com" } })

    const r = await correio.enviar({ nome: DONO.nome, email: DONO.email }, carta)
    expect(r).toEqual({ ok: true, valor: { id: "<id-1@exemplo.com>" } })
    const m = enviadas[0]
    expect(m.from).toEqual({ name: "Classificados Digitais do Brasil", address: "site@exemplo.com" })
    expect(m.to).toEqual({ name: "Álvaro Federal", address: "dono@exemplo.com" })
    expect(m.replyTo).toEqual({ name: "Maria Souza", address: "maria@exemplo.com" })
    expect(m.subject).toBe('Nova mensagem no seu anúncio "Vendo Gol 2010"')
    expect(m.text).toContain("Mensagem de Maria Souza:")
    expect(m.html).toContain("Mensagem de Maria Souza")
    expect(m.headers["Auto-Submitted"]).toBe("auto-generated")
  })

  it("RN-103: nome de quem escreveu não carrega sinais de endereço nem quebra de linha para o cabeçalho", async () => {
    const { enviadas, transporte } = transporteFalso()
    const correio = new CorreioSmtp(cfg, "Classificados", transporte)
    const carta = montarAvisoDeMensagemNova({
      ...dadosDaCarta,
      mensagem: { nome: 'Maria" <vitima@banco.com>,\r\nBcc: x@y.com', contato: "maria@exemplo.com", texto: "Olá, tudo bem?" },
    })
    await correio.enviar({ nome: DONO.nome, email: DONO.email }, carta)
    expect(enviadas[0].replyTo?.name).toBe("Maria vitima banco.com Bcc x y.com")
    expect(enviadas[0].replyTo?.address).toBe("maria@exemplo.com")
  })

  it("RN-100: falha do servidor volta como valor, sem exceção e sem expor a senha", async () => {
    const erroDeLogin = Object.assign(new Error("Invalid login: 535 senha segredo recusada"), { code: "EAUTH" })
    const { transporte } = transporteFalso({
      enviar: async () => {
        throw erroDeLogin
      },
      conferir: async () => {
        throw Object.assign(new Error("connect ETIMEDOUT"), { code: "ETIMEDOUT" })
      },
    })
    const correio = new CorreioSmtp(cfg, "Classificados", transporte)

    const envio = await correio.enviar({ nome: "A", email: "a@exemplo.com" }, montarEmailDeTeste("A"))
    expect(envio.ok).toBe(false)
    if (!envio.ok) {
      expect(envio.codigo).toBe("ENVIO_FALHOU")
      expect(envio.mensagem).toContain("recusou o usuário ou a senha")
      expect(envio.mensagem).not.toContain("segredo")
    }
    const conexao = await correio.conferir()
    expect(conexao.ok).toBe(false)
    if (!conexao.ok) expect(conexao.mensagem).toContain("smtp.exemplo.com:465")
  })

  it("endereço de destino estranho ou recusado pelo servidor vira falha", async () => {
    const { enviadas, transporte } = transporteFalso()
    const correio = new CorreioSmtp(cfg, "Classificados", transporte)
    for (const ruim of ["a@b.com, c@d.com", "Nome <a@b.com>", "sem-arroba", "a b@c.com"]) {
      const r = await correio.enviar({ nome: "A", email: ruim }, montarEmailDeTeste("A"))
      expect(r.ok).toBe(false)
    }
    expect(enviadas).toHaveLength(0)

    const recusa = transporteFalso({ enviar: async () => ({ messageId: "x", rejected: ["a@exemplo.com"] }) })
    const r = await new CorreioSmtp(cfg, "Classificados", recusa.transporte).enviar({ nome: "A", email: "a@exemplo.com" }, montarEmailDeTeste("A"))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.codigo).toBe("ENDERECO_RECUSADO")
  })

  it("RF-104: correio desligado nunca envia", async () => {
    const correio = new CorreioDesligado()
    expect(correio.ligado).toBe(false)
    expect((await correio.enviar()).ok).toBe(false)
    expect((await correio.conferir()).ok).toBe(false)
  })

  it("lê as variáveis: porta 465 por padrão, remetente igual ao usuário, e diz o que falta", () => {
    expect(lerConfiguracaoSmtp({})).toEqual({ ok: false, faltam: ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"] })
    expect(lerConfiguracaoSmtp({ SMTP_HOST: "smtp.gmail.com", SMTP_USER: "site@gmail.com", SMTP_PASS: "abcd efgh ijkl mnop" })).toEqual({
      ok: true,
      // A senha de app do Google é mostrada com espaços, que não fazem parte dela.
      cfg: { host: "smtp.gmail.com", porta: 465, usuario: "site@gmail.com", senha: "abcdefghijklmnop", remetente: "site@gmail.com" },
    })
    expect(lerConfiguracaoSmtp({ SMTP_HOST: "smtp-relay.brevo.com", SMTP_PORT: "587", SMTP_USER: "8a1b2c001", SMTP_PASS: "chave com espaço" })).toEqual({
      ok: false,
      faltam: ["SMTP_FROM"],
    })
    expect(
      lerConfiguracaoSmtp({ SMTP_HOST: "smtp-relay.brevo.com", SMTP_PORT: "587", SMTP_USER: "8a1b2c001", SMTP_PASS: "chave com espaço", SMTP_FROM: "avisos@meusite.com.br" }),
    ).toEqual({ ok: true, cfg: { host: "smtp-relay.brevo.com", porta: 587, usuario: "8a1b2c001", senha: "chave com espaço", remetente: "avisos@meusite.com.br" } })
    expect(lerConfiguracaoSmtp({ SMTP_HOST: "smtp.gmail.com", SMTP_PORT: "abc", SMTP_USER: "site@gmail.com", SMTP_PASS: "x" })).toEqual({ ok: false, faltam: ["SMTP_PORT"] })
    expect(lerConfiguracaoSmtp({ SMTP_HOST: "smtp gmail com; rm -rf", SMTP_USER: "site@gmail.com", SMTP_PASS: "x" })).toEqual({ ok: false, faltam: ["SMTP_HOST"] })
  })
})

describe("Depois da resposta (RF-102, RN-100)", () => {
  it("fora de um pedido do Next a tarefa roda na hora, e o erro dela não escapa", async () => {
    const segundoPlano = new DepoisDaResposta()
    let rodou = false
    segundoPlano.executar(async () => {
      rodou = true
    })
    expect(() =>
      segundoPlano.executar(async () => {
        throw new Error("pane na tarefa")
      }),
    ).not.toThrow()
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(rodou).toBe(true)
  })
})
