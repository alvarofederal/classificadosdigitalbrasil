// ADR-19, verificado: as funções do site rodam em São Paulo, perto do banco da Hostinger (RNF-06).
import { readFileSync } from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const config = JSON.parse(readFileSync(path.resolve(__dirname, "../../vercel.json"), "utf8")) as { regions?: string[]; crons?: unknown[] }

describe("Implantação na Vercel (ADR-19)", () => {
  it("RNF-06: as funções rodam só em São Paulo (gru1), a mesma região do banco", () => {
    expect(config.regions).toEqual(["gru1"])
  })

  it("o agendador do aviso de vencimento continua configurado (ADR-17)", () => {
    expect(config.crons).toEqual([{ path: "/api/tarefas/vencimentos", schedule: "0 12 * * *" }])
  })
})
