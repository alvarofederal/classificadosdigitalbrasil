// DOMÍNIO — visitas do anúncio: quem conta, o dia, a cidade e o resumo que o dono vê (feature 013, ADR-18).
// Nenhum IP sai daqui para o banco: a normalização acontece em memória e vira uma chave irreversível
// na infraestrutura (RN-131).

import { ufDe } from "../localidade/uf"

/** RN-134: o navegador avisa no máximo uma visita a cada 30 minutos por anúncio. */
export const INTERVALO_ENTRE_AVISOS_DE_VISITA_MS = 30 * 60_000

/** RN-134: no servidor, a mesma pessoa soma no máximo 20 visitas por dia em cada anúncio. */
export const LIMITE_DE_VISITAS_POR_PESSOA_NO_DIA = 20

/** RF-131 e RF-132: dias no gráfico da lista e da tela do anúncio; cidades na tela. */
export const DIAS_NO_GRAFICO_DA_LISTA = 7
export const DIAS_NO_GRAFICO_DO_ANUNCIO = 30
export const CIDADES_NA_TELA = 10

/** Dia no formato AAAA-MM-DD. */
export type Dia = string

/** RN-136: pessoas, dias e cidades contam a partir deste dia (a entrega da feature 013). */
export const INICIO_DA_CONTAGEM_POR_PESSOA: Dia = "2026-11-12"

// RN-133: o dia é o de Brasília.
const DIA_ISO = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" })

export function diaDeBrasilia(instante: Date): Dia {
  return DIA_ISO.format(instante)
}

/** Soma dias a uma data pura (sem hora nem fuso). */
export function somarDias(dia: Dia, dias: number): Dia {
  const data = new Date(`${dia}T00:00:00Z`)
  data.setUTCDate(data.getUTCDate() + dias)
  return data.toISOString().slice(0, 10)
}

/** Os últimos `quantidade` dias, do mais antigo até `hoje`. */
export function ultimosDias(hoje: Dia, quantidade: number): Dia[] {
  return Array.from({ length: quantidade }, (_, i) => somarDias(hoje, i - quantidade + 1))
}

// ── Quem conta (RN-130, RN-131) ──

const OCTETO = "(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)"
const IPV4 = new RegExp(`^${OCTETO}(\\.${OCTETO}){3}$`)
const IPV4_COM_PORTA = new RegExp(`^(${OCTETO}(?:\\.${OCTETO}){3}):\\d{1,5}$`)
const GRUPOS_DA_REDE_IPV6 = 4 // 4 × 16 bits = /64

/**
 * RN-131: o endereço da conexão. IPv4 inteiro; IPv6 só a rede (/64), porque os aparelhos trocam a outra
 * metade sozinhos, e cada troca viraria uma pessoa nova. null quando não dá para ler.
 */
export function normalizarIp(bruto: string | null | undefined): string | null {
  let ip = (bruto ?? "").split(",")[0].trim().toLowerCase()
  if (!ip) return null
  ip = ip.replace(/^\[([^\]]+)\](:\d+)?$/, "$1") // [::1]:443 → ::1
  const comPorta = IPV4_COM_PORTA.exec(ip)
  if (comPorta) ip = comPorta[1]
  if (IPV4.test(ip)) return ip

  // IPv4 escrito como IPv6: "::ffff:1.2.3.4"
  const mapeado = /^[0:]*:ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(ip)
  if (mapeado) return IPV4.test(mapeado[1]) ? mapeado[1] : null

  const grupos = expandirIpv6(ip.replace(/%.*$/, "")) // fe80::1%eth0 → sem a zona
  return grupos ? `${grupos.slice(0, GRUPOS_DA_REDE_IPV6).join(":")}::/64` : null
}

/** "2001:db8::1" → ["2001","db8","0","0","0","0","0","1"]; null se não for IPv6 válido. */
function expandirIpv6(ip: string): string[] | null {
  if (!/^[0-9a-f:]+$/.test(ip) || !ip.includes(":") || (ip.match(/::/g) ?? []).length > 1) return null
  const [esquerda, direita] = ip.includes("::") ? ip.split("::") : [ip, null]
  const ladoA = esquerda ? esquerda.split(":") : []
  const ladoB = direita ? direita.split(":") : []
  const faltam = 8 - ladoA.length - ladoB.length
  if (direita === null ? faltam !== 0 : faltam < 1) return null
  const grupos = [...ladoA, ...Array<string>(direita === null ? 0 : faltam).fill("0"), ...ladoB]
  if (grupos.length !== 8 || grupos.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null
  return grupos.map((g) => g.replace(/^0+(?=.)/, ""))
}

/**
 * RN-130: robôs de busca, prévias de link e ferramentas. O navegador dentro do Instagram ou do Facebook é de
 * gente e conta. "Cubot" é marca de celular, não robô. Navegador vazio também fica de fora.
 */
const ROBOS =
  /(?<!cu)bot\b|bot\/|crawl|spider|slurp|mediapartners|preview|facebookexternalhit|facebookcatalog|whatsapp|discord|slack|embedly|headless|lighthouse|pagespeed|pingdom|uptime|monitor|vercel|curl\/|wget|python|axios|node-fetch|undici|go-http|java\/|okhttp|postman|insomnia/i

export function ehRobo(navegador: string | null | undefined): boolean {
  const ua = (navegador ?? "").trim()
  return ua.length === 0 || ROBOS.test(ua)
}

// ── De onde (RN-132) ──

export interface LocalDaVisita {
  cidade: string | null
  uf: string | null
  pais: string | null
}

/** RN-132: o que a Vercel informa vira cidade, UF e país limpos. A cidade vem codificada para URL. */
export function localDaVisita(bruto: { cidade?: string | null; regiao?: string | null; pais?: string | null }): LocalDaVisita {
  const paisBruto = (bruto.pais ?? "").trim().toUpperCase()
  const pais = /^[A-Z]{2}$/.test(paisBruto) ? paisBruto : null
  let cidade = bruto.cidade ?? ""
  try {
    cidade = decodeURIComponent(cidade)
  } catch {
    // codificação quebrada: fica o texto como veio, limpo abaixo
  }
  cidade = cidade
    .replace(/[\u0000-\u001f\u007f<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
  return { cidade: cidade || null, uf: pais === "BR" ? ufDe(bruto.regiao) : null, pais }
}

// ── O que o dono vê (RF-131, RF-132) ──

export interface VisitasDoDia {
  dia: Dia
  visitas: number
  pessoas: number
}

export interface ResumoDeVisitas {
  /** RN-136: o total do anúncio, com as visitas contadas antes desta entrega. */
  visitas: number
  /** Pessoas diferentes desde que a contagem por pessoa começou; null sem o segredo (RN-135). */
  pessoas: number | null
  hoje: VisitasDoDia
  /** Visitas dos últimos 7 dias, hoje incluído. */
  visitasNaSemana: number
  /** Um item por dia, do mais antigo até hoje; dia sem visita vem com zero. */
  dias: VisitasDoDia[]
  /** A maior quantidade de visitas num dia da série, para a escala do gráfico. */
  maiorDia: number
}

export function resumirVisitas(dados: {
  visitas: number
  pessoas: number | null
  linhas: VisitasDoDia[]
  hoje: Dia
  quantidadeDeDias: number
}): ResumoDeVisitas {
  const porDia = new Map(dados.linhas.map((l) => [l.dia, l]))
  const serie = (quantidade: number) => ultimosDias(dados.hoje, quantidade).map((dia) => porDia.get(dia) ?? { dia, visitas: 0, pessoas: 0 })
  const dias = serie(dados.quantidadeDeDias)
  return {
    visitas: dados.visitas,
    pessoas: dados.pessoas,
    hoje: porDia.get(dados.hoje) ?? { dia: dados.hoje, visitas: 0, pessoas: 0 },
    visitasNaSemana: serie(7).reduce((soma, d) => soma + d.visitas, 0),
    dias,
    maiorDia: Math.max(0, ...dias.map((d) => d.visitas)),
  }
}

export interface CidadeDasVisitas {
  nome: string
  pessoas: number
  /** Linha que soma várias (outras cidades, fora do Brasil, sem localização): vai para o fim da lista. */
  agrupada: boolean
}

/** RF-132: as cidades com mais pessoas primeiro; depois das 10 primeiras, o resto vira "Outras cidades". */
export function cidadesDasVisitas(linhas: Array<LocalDaVisita & { pessoas: number }>, limite = CIDADES_NA_TELA): CidadeDasVisitas[] {
  const noBrasil = new Map<string, number>()
  let foraDoBrasil = 0
  let semLocal = 0
  for (const l of linhas) {
    if (l.pais && l.pais !== "BR") foraDoBrasil += l.pessoas
    else if (!l.cidade) semLocal += l.pessoas
    else {
      const nome = l.uf ? `${l.cidade}/${l.uf}` : l.cidade
      noBrasil.set(nome, (noBrasil.get(nome) ?? 0) + l.pessoas)
    }
  }
  const cidades = [...noBrasil].map(([nome, pessoas]) => ({ nome, pessoas, agrupada: false })).sort((a, b) => b.pessoas - a.pessoas || a.nome.localeCompare(b.nome, "pt-BR"))
  const resultado = cidades.slice(0, limite)
  const outras = cidades.slice(limite).reduce((soma, c) => soma + c.pessoas, 0)
  if (outras > 0) resultado.push({ nome: "Outras cidades", pessoas: outras, agrupada: true })
  if (foraDoBrasil > 0) resultado.push({ nome: "Fora do Brasil", pessoas: foraDoBrasil, agrupada: true })
  if (semLocal > 0) resultado.push({ nome: "Sem localização", pessoas: semLocal, agrupada: true })
  return resultado
}
