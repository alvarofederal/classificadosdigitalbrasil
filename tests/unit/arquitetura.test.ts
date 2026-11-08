// Art. 1 da constituição, verificado: as dependências apontam sempre para dentro.
import { readFileSync, readdirSync, statSync } from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const RAIZ = path.resolve(__dirname, "../../src")

function arquivos(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = path.join(pasta, nome)
    return statSync(caminho).isDirectory() ? arquivos(caminho) : /\.tsx?$/.test(nome) ? [caminho] : []
  })
}

function importsDe(arquivo: string): string[] {
  const codigo = readFileSync(arquivo, "utf8")
  return [...codigo.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1])
}

const PROIBIDOS_NO_DOMINIO = [/^next/, /^react/, /generated\/prisma/, /^@prisma/, /^cloudinary/, /^bcryptjs/, /^zod/, /^qrcode/, /^@\/(application|infrastructure|app|lib|components)/]
const PROIBIDOS_NA_APLICACAO = [/^next/, /^react/, /generated\/prisma/, /^@prisma/, /^cloudinary/, /^bcryptjs/, /^qrcode/, /^@\/(infrastructure|app|lib|components)/]

describe("Regra de dependência (Art. 1)", () => {
  it.each(arquivos(path.join(RAIZ, "domain")).map((a) => [path.relative(RAIZ, a), a]))("domínio puro: %s", (_nome, arquivo) => {
    expect(importsDe(arquivo).filter((imp) => PROIBIDOS_NO_DOMINIO.some((regra) => regra.test(imp)))).toEqual([])
  })

  it.each(arquivos(path.join(RAIZ, "application")).map((a) => [path.relative(RAIZ, a), a]))("aplicação sem framework: %s", (_nome, arquivo) => {
    expect(importsDe(arquivo).filter((imp) => PROIBIDOS_NA_APLICACAO.some((regra) => regra.test(imp)))).toEqual([])
  })
})
