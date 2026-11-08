// Gera a lista de municípios a partir da API de localidades do IBGE (ADR-06).
// Rodar só quando o IBGE criar ou renomear município: `npm run municipios`.
//
// Saídas:
//   src/infrastructure/localidades/municipios.json  → servidor (validação e endereços /uf/cidade)
//   public/municipios/<UF>.json                      → navegador (filtro UF → Cidade, baixado sob demanda)
// Formato de cada cidade: [códigoIBGE, nome, slug]

import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"

const URL_IBGE = "https://servicodados.ibge.gov.br/api/v1/localidades/municipios?view=nivelado"
const raiz = path.resolve(import.meta.dirname, "..")

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
for (const item of lista) {
  const uf = item["UF-sigla"]
  porUf[uf] ??= []
  porUf[uf].push([Number(item["municipio-id"]), item["municipio-nome"], slug(item["municipio-nome"])])
}

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
  writeFileSync(path.join(pastaPublica, `${uf}.json`), JSON.stringify(cidades))
}

console.log(`✔ ${total} municípios em ${Object.keys(ordenado).length} UFs`)
