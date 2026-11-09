// Gera a lista de municípios a partir da API de localidades do IBGE (ADR-06).
// Rodar só quando o IBGE criar ou renomear município: `npm run municipios`.
//
// Saídas:
//   src/infrastructure/localidades/municipios.json  → servidor: [códigoIBGE, nome, slug, latitude, longitude]
//   public/municipios/<UF>.json                      → navegador (filtro UF → Cidade): [códigoIBGE, nome, slug]
// As coordenadas (para "anúncios perto de mim", feature 002) vêm da base pública kelvins/municipios-brasileiros,
// casadas pelo código do IBGE.

import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"

const URL_IBGE = "https://servicodados.ibge.gov.br/api/v1/localidades/municipios?view=nivelado"
const URL_COORDENADAS = "https://raw.githubusercontent.com/kelvins/municipios-brasileiros/main/json/municipios.json"
const raiz = path.resolve(import.meta.dirname, "..")

const respostaCoordenadas = await fetch(URL_COORDENADAS)
if (!respostaCoordenadas.ok) throw new Error(`Base de coordenadas respondeu ${respostaCoordenadas.status}`)
const coordenadas = new Map(
  (await respostaCoordenadas.json()).map((m) => [Number(m.codigo_ibge), [Number(m.latitude.toFixed(4)), Number(m.longitude.toFixed(4))]]),
)

function slug(nome) {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

const resposta = await fetch(URL_IBGE)
if (!resposta.ok) throw new Error(`IBGE respondeu ${resposta.status}`)
const lista = await resposta.json()

const porUf = {}
const semCoordenada = []
for (const item of lista) {
  const uf = item["UF-sigla"]
  const codigo = Number(item["municipio-id"])
  const coordenada = coordenadas.get(codigo)
  if (!coordenada) semCoordenada.push(`${item["municipio-nome"]}/${uf}`)
  porUf[uf] ??= []
  porUf[uf].push([codigo, item["municipio-nome"], slug(item["municipio-nome"]), ...(coordenada ?? [null, null])])
}
if (semCoordenada.length > 0) console.log(`• Sem coordenada (fora do "perto de mim"): ${semCoordenada.join(", ")}`)

let total = 0
for (const [uf, cidades] of Object.entries(porUf)) {
  cidades.sort((a, b) => a[1].localeCompare(b[1], "pt-BR"))
  const slugs = new Set()
  for (const cidade of cidades) {
    if (slugs.has(cidade[2])) throw new Error(`Slug repetido em ${uf}: ${cidade[2]}`)
    slugs.add(cidade[2])
  }
  total += cidades.length
}

const ordenado = Object.fromEntries(Object.entries(porUf).sort(([a], [b]) => a.localeCompare(b)))

const pastaServidor = path.join(raiz, "src/infrastructure/localidades")
mkdirSync(pastaServidor, { recursive: true })
writeFileSync(path.join(pastaServidor, "municipios.json"), JSON.stringify(ordenado))

const pastaPublica = path.join(raiz, "public/municipios")
mkdirSync(pastaPublica, { recursive: true })
for (const [uf, cidades] of Object.entries(ordenado)) {
  writeFileSync(path.join(pastaPublica, `${uf}.json`), JSON.stringify(cidades.map(([codigo, nome, s]) => [codigo, nome, s])))
}

console.log(`✔ ${total} municípios em ${Object.keys(ordenado).length} UFs`)
