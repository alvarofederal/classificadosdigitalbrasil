# CLAUDE.md · Classificados Digitais do Brasil

Antes de mudar código, leia `spec/` (comece por `00-constitution.md`, `05-tasks.md` e `spec/README.md`).

## Spec-Driven Development (obrigatório)

Toda funcionalidade nova segue: **especificar → planejar → quebrar em tarefas → implementar e verificar**, numa pasta `spec/features/NNN-nome/spec.md` (seções Spec, Plano, Tarefas). Requisitos com ID (RF-xx, RN-xx), testes que citam esses IDs, ADR novo em `spec/02-plan.md` quando a arquitetura muda, e `spec/05-tasks.md` atualizado com o que foi feito de fato.

## Regras do projeto

- Camadas: `domain` (puro) ← `application` (casos de uso e portas) ← `infrastructure` (Prisma, Cloudinary, IBGE) ← `app`/`components`/`lib`. O teste `tests/unit/arquitetura.test.ts` quebra se a regra for violada.
- Negócio e domínio em português; termos técnicos em inglês (`Repository`, `UseCase`).
- Toda regra nova ganha teste em `tests/unit` e um RF/RN em `spec/01-spec.md`. Toda decisão de arquitetura vira ADR em `spec/02-plan.md`.
- Dinheiro em centavos inteiros; no banco, `Decimal`.
- A lista pública é sempre de uma cidade e uma seção (RNF-01).
- Textos do site objetivos, sem slogan.
- Banco só muda no deploy de produção (`scripts/vercel-build.mjs`). Migration nova: `npx prisma migrate dev` num banco local, ou `prisma migrate diff` para gerar o SQL.
- Nunca commitar `.env` (nem `,env`).

## Comandos

- `npm run dev` · `npm test` · `npm run typecheck` · `npx next build`
- `npm run db:seed` · `npm run db:seed:demo`
