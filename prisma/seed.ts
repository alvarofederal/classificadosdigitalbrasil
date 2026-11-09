// prisma/seed.ts — npm run db:seed (base) | npm run db:seed:demo (base + anúncios de demonstração)
// Base: idempotente. Roda a cada deploy de produção (vercel-build).

import bcrypt from "bcryptjs"
import { config } from "dotenv"
import { PrismaClient } from "../src/generated/prisma"
import { ALFABETO_DO_CODIGO } from "../src/domain/anuncio/anuncio"
import { CATEGORIAS_INICIAIS, slugDaCategoria } from "../src/domain/categoria/categoria"
import { PLANOS_INICIAIS } from "../src/domain/plano/plano"
import { centavosParaDecimal } from "../src/domain/shared/dinheiro"

config({ quiet: true })
const prisma = new PrismaClient()

const DOMINIO_DEMO = "@demo.classificados.test"

/** Prefixo + 2 letras do alfabeto dos códigos (sem 0, 1, I, L, O). */
function codigoDemo(prefixo: string, i: number): string {
  return `${prefixo}${ALFABETO_DO_CODIGO[Math.floor(i / ALFABETO_DO_CODIGO.length)]}${ALFABETO_DO_CODIGO[i % ALFABETO_DO_CODIGO.length]}`
}

async function base() {
  // Categorias: só cria as que faltam; nunca sobrescreve o que o admin editou.
  if ((await prisma.categoria.count()) === 0) {
    await prisma.categoria.createMany({
      data: CATEGORIAS_INICIAIS.map((nome, i) => ({ nome, slug: slugDaCategoria(nome), ordem: (i + 1) * 10, ativa: true })),
    })
    console.log(`✔ ${CATEGORIAS_INICIAIS.length} categorias criadas`)
  } else {
    console.log("• Categorias já existem: nada alterado")
  }

  await prisma.configuracao.upsert({ where: { id: "geral" }, update: {}, create: { id: "geral" } })

  // Planos (feature 003): cria os que faltam com a tabela inicial; nunca sobrescreve preço editado no painel.
  let criados = 0
  for (const plano of PLANOS_INICIAIS) {
    if (await prisma.plano.findUnique({ where: { codigo: plano.codigo } })) continue
    await prisma.plano.create({
      data: {
        codigo: plano.codigo,
        nome: plano.nome,
        descricao: plano.descricao,
        maxFotos: plano.maxFotos,
        valor7Dias: centavosParaDecimal(plano.valor7DiasCentavos),
        valor30Dias: centavosParaDecimal(plano.valor30DiasCentavos),
        ativo: plano.ativo,
      },
    })
    criados++
  }
  console.log(criados > 0 ? `✔ ${criados} plano(s) criado(s) com a tabela inicial` : "• Planos já existem: preços mantidos")

  if ((await prisma.usuario.count({ where: { perfil: "ADMIN" } })) > 0) {
    console.log("• Já existe administrador: nenhum usuário criado")
    return
  }
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase()
  const senha = process.env.SEED_ADMIN_SENHA
  if (!email || !senha) {
    console.log("• SEED_ADMIN_EMAIL/SEED_ADMIN_SENHA não definidos: admin inicial não criado")
    return
  }
  await prisma.usuario.create({
    data: {
      nome: process.env.SEED_ADMIN_NOME || "Administrador",
      email,
      senhaHash: await bcrypt.hash(senha, 10),
      perfil: "ADMIN",
      deveTrocarSenha: true,
    },
  })
  console.log(`✔ Admin inicial criado: ${email} (troca de senha obrigatória no 1º acesso)`)
}

// ── Demonstração: anúncios em Brasília/DF para ver o caderno funcionando. Removíveis com --limpar-demo. ──

type Demo = {
  secao: string
  titulo: string
  texto: string
  preco?: string
  moldura: "NENHUMA" | "SIMPLES" | "DUPLA" | "TRACEJADA"
  estiloTitulo: "NEGRITO" | "TARJA" | "SUBLINHADO"
  alinhamento?: "ESQUERDA" | "CENTRO"
  estrelas?: boolean
}

const ANUNCIOS_DEMO: Demo[] = [
  { secao: "veiculos", titulo: "Vendo Gol 2010", texto: "Completo, 4 portas, revisado, IPVA pago. Pneus novos. Aceito proposta.", preco: "22000.00", moldura: "SIMPLES", estiloTitulo: "NEGRITO" },
  { secao: "veiculos", titulo: "Moto CG 160 Fan 2022", texto: "Único dono, 12 mil km, manual e chave reserva. Revisões na concessionária.", preco: "15900.00", moldura: "DUPLA", estiloTitulo: "TARJA" },
  { secao: "veiculos", titulo: "Compro carro com débito", texto: "Pago à vista, busco onde estiver. Documentação por nossa conta.", moldura: "TRACEJADA", estiloTitulo: "SUBLINHADO", alinhamento: "CENTRO" },
  { secao: "veiculos", titulo: "Corolla XEi 2021", texto: "Automático, banco de couro, 58 mil km rodados na estrada. Carro de garagem.", preco: "119900.00", moldura: "SIMPLES", estiloTitulo: "TARJA", estrelas: true },
  { secao: "imoveis", titulo: "Aluga-se kitnet", texto: "Quarto, cozinha e banheiro. Água inclusa. Próximo ao metrô. Ideal para estudante.", preco: "950.00", moldura: "SIMPLES", estiloTitulo: "NEGRITO" },
  { secao: "imoveis", titulo: "Vendo casa 3 quartos", texto: "Lote de 300 m², garagem para 2 carros, quintal amplo. Escriturada.", preco: "480000.00", moldura: "DUPLA", estiloTitulo: "TARJA", alinhamento: "CENTRO", estrelas: true },
  { secao: "imoveis", titulo: "Sala comercial", texto: "40 m², com banheiro e vaga coberta. Prédio com portaria 24 horas.", preco: "1800.00", moldura: "NENHUMA", estiloTitulo: "SUBLINHADO" },
  { secao: "empregos-e-formacao-profissional", titulo: "Contrata-se balconista", texto: "Padaria no centro. Experiência com caixa. Escala 6x1. Enviar mensagem com currículo.", moldura: "SIMPLES", estiloTitulo: "TARJA" },
  { secao: "empregos-e-formacao-profissional", titulo: "Aulas de reforço", texto: "Matemática e português do 1º ao 9º ano. Atendo em casa ou online.", preco: "50.00", moldura: "TRACEJADA", estiloTitulo: "NEGRITO" },
  { secao: "servicos-profissionais", titulo: "Faço fretes e mudanças", texto: "Caminhonete com baú. Montagem e desmontagem de móveis. Orçamento sem compromisso.", moldura: "DUPLA", estiloTitulo: "TARJA", estrelas: true },
  { secao: "servicos-profissionais", titulo: "Diarista", texto: "Limpeza de casas e apartamentos. Referências. Segunda a sábado.", preco: "180.00", moldura: "SIMPLES", estiloTitulo: "SUBLINHADO" },
  { secao: "servicos-profissionais", titulo: "Eletricista", texto: "Instalações, quadros de energia, chuveiros e tomadas. Atendimento no mesmo dia.", moldura: "NENHUMA", estiloTitulo: "NEGRITO", alinhamento: "CENTRO" },
  { secao: "para-sua-casa", titulo: "Geladeira frost free", texto: "Duplex 400 litros, funcionando perfeitamente. Retirar no local.", preco: "1200.00", moldura: "SIMPLES", estiloTitulo: "NEGRITO" },
  { secao: "pet", titulo: "Doa-se filhotes", texto: "Três filhotes vacinados e vermifugados, porte médio. Só para quem tem quintal.", moldura: "TRACEJADA", estiloTitulo: "TARJA", alinhamento: "CENTRO", estrelas: true },
]

async function demo() {
  if ((await prisma.usuario.count({ where: { email: { endsWith: DOMINIO_DEMO } } })) > 0) {
    console.log("• Os anúncios de demonstração já existem: nada foi criado.")
    return
  }
  const categorias = new Map((await prisma.categoria.findMany({ select: { id: true, slug: true } })).map((c) => [c.slug, c.id]))
  const anunciante = await prisma.usuario.create({
    data: {
      nome: "Anunciante Demonstração",
      email: `anunciante${DOMINIO_DEMO}`,
      senhaHash: await bcrypt.hash(`demo-${Date.now()}-${Math.random()}`, 10),
      celular: "61900000000",
      uf: "DF",
      cidadeCodigo: 5300108,
      aceitouTermosEm: new Date(),
    },
  })
  const agora = Date.now()
  let criados = 0
  for (const [i, a] of ANUNCIOS_DEMO.entries()) {
    const categoriaId = categorias.get(a.secao)
    if (!categoriaId) continue
    const publicadoEm = new Date(agora - i * 3_600_000)
    const anuncio = await prisma.anuncio.create({
      data: {
        codigo: codigoDemo("DEMA", i),
        usuarioId: anunciante.id,
        categoriaId,
        uf: "DF",
        cidadeCodigo: 5300108,
        titulo: a.titulo,
        texto: `${a.texto} (Anúncio de demonstração.)`,
        preco: a.preco ?? null,
        moldura: a.moldura,
        estiloTitulo: a.estiloTitulo,
        alinhamento: a.alinhamento ?? "ESQUERDA",
        estrelas: a.estrelas ?? false,
        situacao: "PUBLICADO",
        publicadoEm,
        expiraEm: new Date(publicadoEm.getTime() + 7 * 86_400_000),
      },
    })
    await prisma.pagamento.create({
      data: {
        codigo: codigoDemo("DEMAPGTO", i),
        anuncioId: anuncio.id,
        usuarioId: anunciante.id,
        valor: "1.00",
        dias: 7,
        situacao: "CONFIRMADO",
        confirmadoEm: publicadoEm,
      },
    })
    criados++
  }
  console.log(`✔ Demonstração: ${criados} anúncios em Brasília/DF (remova com SEED_LIMPAR_DEMO=1)`)
}

/** Remove só o que o --demo criou (conta com e-mail @demo.classificados.test e os anúncios dela). */
async function limparDemo() {
  const usuarios = await prisma.usuario.findMany({ where: { email: { endsWith: DOMINIO_DEMO } }, select: { id: true } })
  const ids = usuarios.map((u) => u.id)
  if (ids.length === 0) {
    console.log("• Não há demonstração para remover.")
    return
  }
  await prisma.$transaction(async (tx) => {
    const anuncios = (await tx.anuncio.findMany({ where: { usuarioId: { in: ids } }, select: { id: true } })).map((a) => a.id)
    await tx.pagamento.deleteMany({ where: { anuncioId: { in: anuncios } } })
    await tx.mensagem.deleteMany({ where: { anuncioId: { in: anuncios } } })
    await tx.fotoAnuncio.deleteMany({ where: { anuncioId: { in: anuncios } } })
    await tx.anuncio.deleteMany({ where: { id: { in: anuncios } } })
    await tx.sessao.deleteMany({ where: { usuarioId: { in: ids } } })
    await tx.usuario.deleteMany({ where: { id: { in: ids } } })
  })
  console.log("✔ Demonstração removida.")
}

base()
  .then(() => (process.argv.includes("--limpar-demo") ? limparDemo() : undefined))
  .then(() => (process.argv.includes("--demo") ? demo() : undefined))
  .catch((erro) => {
    console.error(erro)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
