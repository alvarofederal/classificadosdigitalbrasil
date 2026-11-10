// INFRAESTRUTURA — a cara do e-mail: transforma a carta em HTML e em texto puro (feature 010, RN-103).
// Página branca, tinta preta, manchete e fios, como o caderno (spec/04-design-system.md).
// Tudo o que vem da carta é escapado: o texto de quem escreveu nunca vira HTML.

import type { Carta } from "@/domain/shared/carta"

const TINTA = "#111111"
const TINTA_SUAVE = "#555555"
// Fontes da web não carregam em e-mail: valem as parecidas que todo programa de e-mail tem.
const MANCHETE = "Impact, 'Arial Narrow', Arial, sans-serif"
const TITULO = "'Arial Narrow', Arial, Helvetica, sans-serif"
const TEXTO = "Georgia, 'Times New Roman', Times, serif"

export function escaparHtml(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")
}

/** Assunto e nomes vão em cabeçalhos do e-mail: sem quebra de linha nem caractere de controle. */
export function emUmaLinha(texto: string, maximo = 200): string {
  return texto
    .replace(/[\u0000-\u001F\u007F\u2028\u2029]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximo)
}

/** Só https, http e mailto viram link; qualquer outro endereço aparece como texto. */
function linkSeguro(url: string | null): string | null {
  return url && /^(https?:\/\/|mailto:)[^\s"'<>]+$/i.test(url) ? url : null
}

function comQuebras(texto: string): string {
  return escaparHtml(texto).replace(/\r\n?|\n/g, "<br>")
}

function paragrafo(html: string, estilo = ""): string {
  return `<p style="margin:0 0 14px;${estilo}">${html}</p>`
}

export function cartaEmHtml(carta: Carta): string {
  const partes: string[] = [paragrafo(escaparHtml(carta.saudacao)), ...carta.paragrafos.map((p) => paragrafo(escaparHtml(p)))]

  if (carta.citacao) {
    partes.push(
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px;"><tr><td style="border:1px solid ${TINTA};padding:12px 14px;">` +
        `<p style="margin:0 0 6px;font-family:${TITULO};font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:${TINTA};">Mensagem de ${escaparHtml(carta.citacao.autor)}</p>` +
        `<p style="margin:0;font-family:${TEXTO};font-size:16px;line-height:1.5;color:${TINTA};">${comQuebras(carta.citacao.texto)}</p>` +
        `</td></tr></table>`,
    )
  }

  for (const linha of carta.linhas) {
    const link = linkSeguro(linha.link)
    const valor = link ? `<a href="${escaparHtml(link)}" style="color:${TINTA};">${escaparHtml(linha.valor)}</a>` : `<strong>${escaparHtml(linha.valor)}</strong>`
    partes.push(paragrafo(`<strong>${escaparHtml(linha.rotulo)}:</strong> ${valor}`, "margin-bottom:6px;"))
  }

  const botao = carta.botao && linkSeguro(carta.botao.url) ? carta.botao : null
  if (botao) {
    partes.push(
      `<p style="margin:20px 0 0;"><a href="${escaparHtml(botao.url)}" style="display:inline-block;background:${TINTA};color:#ffffff;font-family:${TITULO};font-size:14px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:12px 18px;">${escaparHtml(botao.rotulo)}</a></p>`,
    )
  }

  for (const observacao of carta.observacoes) {
    partes.push(`<p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:${TINTA_SUAVE};">${escaparHtml(observacao)}</p>`)
  }

  // A primeira frase aparece ao lado do assunto na caixa de entrada.
  const previa = escaparHtml(carta.paragrafos[0] ?? carta.saudacao)

  return [
    `<!doctype html>`,
    `<html lang="pt-BR">`,
    `<head>`,
    `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<meta name="color-scheme" content="light">`,
    `<title>${escaparHtml(carta.assunto)}</title>`,
    `</head>`,
    `<body style="margin:0;padding:0;background:#ffffff;color:${TINTA};">`,
    `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${previa}</div>`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;">`,
    `<tr><td align="center" style="padding:24px 16px;">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">`,
    `<tr><td style="border-top:4px solid ${TINTA};border-bottom:3px double ${TINTA};padding:8px 0 6px;text-align:center;font-family:${MANCHETE};font-size:36px;line-height:1.1;letter-spacing:1px;color:${TINTA};">CLASSIFICADOS</td></tr>`,
    `<tr><td style="border-bottom:1px solid ${TINTA};padding:5px 0;text-align:center;font-family:${TITULO};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${TINTA};">Digitais do Brasil</td></tr>`,
    // Palavra ou endereço comprido quebra em vez de alargar a página no celular.
    `<tr><td style="padding:22px 0 0;font-family:${TEXTO};font-size:16px;line-height:1.55;color:${TINTA};word-wrap:break-word;overflow-wrap:anywhere;">`,
    ...partes,
    `</td></tr>`,
    `<tr><td style="padding:22px 0 0;"><div style="border-top:1px solid ${TINTA};font-size:0;line-height:0;">&nbsp;</div></td></tr>`,
    `<tr><td style="padding:10px 0 0;font-family:${TITULO};font-size:12px;line-height:1.5;color:${TINTA_SUAVE};">${escaparHtml(carta.rodape)}</td></tr>`,
    `</table>`,
    `</td></tr>`,
    `</table>`,
    `</body>`,
    `</html>`,
  ].join("\n")
}

/** A mesma carta para quem lê e-mail sem HTML. */
export function cartaEmTexto(carta: Carta): string {
  const blocos: string[] = ["CLASSIFICADOS DIGITAIS DO BRASIL", carta.saudacao, ...carta.paragrafos]

  if (carta.citacao) {
    const citado = carta.citacao.texto
      .split(/\r\n?|\n/)
      .map((linha) => `> ${linha}`)
      .join("\n")
    blocos.push(`Mensagem de ${carta.citacao.autor}:\n${citado}`)
  }

  if (carta.linhas.length > 0) {
    blocos.push(
      carta.linhas
        .map((linha) => {
          const link = linkSeguro(linha.link)
          // O endereço de e-mail já está no valor; repetir o mailto só polui.
          return link && !link.startsWith("mailto:") ? `${linha.rotulo}: ${linha.valor}\n${link}` : `${linha.rotulo}: ${linha.valor}`
        })
        .join("\n"),
    )
  }

  if (carta.botao && linkSeguro(carta.botao.url)) blocos.push(`${carta.botao.rotulo}:\n${carta.botao.url}`)
  blocos.push(...carta.observacoes)
  blocos.push(`--\n${carta.rodape}`)
  return blocos.join("\n\n")
}
