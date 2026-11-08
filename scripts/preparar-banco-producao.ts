// Roda no deploy, ANTES do `prisma migrate deploy` (vercel-build).
//
// Por que existe: o build do projetobase faz `prisma db push --accept-data-loss` e cria as tabelas do
// Courtesyfy no banco de quem o rodou. Com elas lá, a primeira migration falha (P3005).
//
// Só apaga se TODAS as travas forem verdadeiras:
//   1. o banco ainda não é gerenciado por migrations (sem `_prisma_migrations`);
//   2. todas as tabelas existentes são as do Courtesyfy (nenhuma desconhecida);
//   3. todas estão vazias.
// Qualquer outra situação: não toca em nada e, se houver risco, interrompe o deploy com a explicação.

import { config } from "dotenv"
import { PrismaClient } from "../src/generated/prisma"

config({ quiet: true })

const TABELAS_HERDADAS = [
  "users", "accounts", "sessions", "verification_tokens", "auth_tokens", "login_attempts",
  "lojas", "layouts", "campanhas", "lotes_chaves", "chaves", "clientes", "resgates",
  "logs_eventos", "solicitacoes_impressao",
]

async function main() {
  const prisma = new PrismaClient()
  try {
    const linhas = await prisma.$queryRaw<Array<Record<string, string>>>`
      SELECT table_name AS nome FROM information_schema.tables WHERE table_schema = DATABASE()`
    const tabelas = linhas.map((l) => String(l.nome ?? Object.values(l)[0]))

    if (tabelas.includes("_prisma_migrations")) {
      console.log("• Banco já gerenciado por migrations: nada a preparar.")
      return
    }
    if (tabelas.length === 0) {
      console.log("• Banco vazio: pronto para a primeira migration.")
      return
    }

    const desconhecidas = tabelas.filter((t) => !TABELAS_HERDADAS.includes(t))
    if (desconhecidas.length > 0) {
      throw new Error(`O banco tem tabelas que não são do projetobase (${desconhecidas.join(", ")}). Nada foi apagado; verifique o DATABASE_URL.`)
    }

    const comDados: string[] = []
    for (const tabela of tabelas) {
      const [{ total }] = await prisma.$queryRawUnsafe<Array<{ total: bigint }>>(`SELECT COUNT(*) AS total FROM \`${tabela}\``)
      if (Number(total) > 0) comDados.push(`${tabela} (${total})`)
    }
    if (comDados.length > 0) {
      throw new Error(`Tabelas herdadas com dados: ${comDados.join(", ")}. Nada foi apagado; limpe manualmente se tiver certeza.`)
    }

    console.log(`• Removendo ${tabelas.length} tabelas vazias herdadas do projetobase: ${tabelas.join(", ")}`)
    for (const tabela of tabelas) await prisma.$executeRawUnsafe(`DROP TABLE \`${tabela}\``)
    console.log("✔ Banco pronto para a primeira migration.")
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((erro) => {
  console.error(`✖ ${erro instanceof Error ? erro.message : erro}`)
  process.exit(1)
})
