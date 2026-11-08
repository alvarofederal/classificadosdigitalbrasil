// INFRAESTRUTURA — PrismaClient único por processo (evita esgotar conexões no hot reload).
import { PrismaClient } from "@/generated/prisma"

const global_ = globalThis as typeof globalThis & { prismaClassificados?: PrismaClient }

export const prisma =
  global_.prismaClassificados ?? new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"] })

if (process.env.NODE_ENV !== "production") global_.prismaClassificados = prisma
