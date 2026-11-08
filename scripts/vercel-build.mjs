// Build na Vercel (ADR-09). O banco só é alterado no deploy de PRODUÇÃO:
// os previews usam o mesmo DATABASE_URL, e uma branch não pode migrar o banco real antes do merge.
import { execSync } from "node:child_process"

const rodar = (comando) => execSync(comando, { stdio: "inherit" })

rodar("prisma generate")
if (process.env.VERCEL_ENV === "production") {
  rodar("tsx scripts/preparar-banco-producao.ts")
  rodar("prisma migrate deploy")
  // SEED_DEMO=1 cria anúncios de demonstração; SEED_LIMPAR_DEMO=1 remove só eles. Ambos são idempotentes.
  const extras = [process.env.SEED_LIMPAR_DEMO === "1" && "--limpar-demo", process.env.SEED_DEMO === "1" && "--demo"].filter(Boolean)
  rodar(["tsx prisma/seed.ts", ...extras].join(" "))
} else {
  console.log(`• Deploy ${process.env.VERCEL_ENV ?? "local"}: banco não é alterado (migrations e seed só em produção).`)
}
rodar("next build")
