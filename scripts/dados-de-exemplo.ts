// Feature 007 — anúncio do Gol no plano Vitrine por 30 dias e um exemplo por seção em Brasília/DF.
// Uso: npx tsx scripts/dados-de-exemplo.ts   (DATABASE_URL do banco desejado no ambiente)
// Idempotente: o Gol só é publicado se ainda não estiver no ar como Vitrine; os exemplos só são criados uma vez.
// Os exemplos NÃO são apagados por este script: o Álvaro remove pelo painel conforme testa (RF-92).

import bcrypt from "bcryptjs"
import { config } from "dotenv"
import type { Moldura, EstiloDeTitulo, Alinhamento } from "../src/domain/anuncio/anuncio"
import { container } from "../src/infrastructure/container"
import { prisma } from "../src/infrastructure/prisma/cliente"

config({ quiet: true })

const BRASILIA = 5300108
const CODIGO_DO_GOL = "9TTTMQ"
const EMAIL_DOS_EXEMPLOS = "exemplos@exemplo.classificados.test"

type Exemplo = {
  secao: string
  plano: "SIMPLES" | "FOTOS" | "DESTAQUE"
  titulo: string
  texto: string
  preco?: number
  moldura: Moldura
  estiloTitulo: EstiloDeTitulo
  alinhamento?: Alinhamento
  estrelas?: boolean
}

const EXEMPLOS: Exemplo[] = [
  { secao: "imoveis", plano: "DESTAQUE", titulo: "Aluga-se kitnet na Asa Norte", texto: "Quarto, cozinha e banheiro, 30 m². Água inclusa. Perto do metrô e da UnB.", preco: 135000, moldura: "DUPLA", estiloTitulo: "TARJA", alinhamento: "CENTRO" },
  { secao: "veiculos", plano: "FOTOS", titulo: "Moto CG 160 Fan 2022", texto: "Único dono, 12 mil km, manual e chave reserva. Revisões na concessionária.", preco: 1590000, moldura: "SIMPLES", estiloTitulo: "NEGRITO" },
  { secao: "empregos-e-formacao-profissional", plano: "SIMPLES", titulo: "Contrata-se balconista", texto: "Padaria no Sudoeste. Experiência com caixa, escala 6x1. Mande mensagem com seu contato.", moldura: "SIMPLES", estiloTitulo: "SUBLINHADO" },
  { secao: "servicos-profissionais", plano: "DESTAQUE", titulo: "Faço fretes e mudanças", texto: "Caminhonete baú. Montagem e desmontagem de móveis. Orçamento sem compromisso.", moldura: "DUPLA", estiloTitulo: "TARJA", estrelas: true },
  { secao: "comercio-e-negocios", plano: "SIMPLES", titulo: "Passo o ponto de lanchonete", texto: "Taguatinga Centro, clientela formada, equipamentos inclusos.", preco: 4500000, moldura: "TRACEJADA", estiloTitulo: "NEGRITO" },
  { secao: "para-sua-casa", plano: "FOTOS", titulo: "Geladeira frost free 400 L", texto: "Duplex, funcionando perfeitamente. Retirar no Guará.", preco: 120000, moldura: "SIMPLES", estiloTitulo: "NEGRITO" },
  { secao: "eletronicos-e-informatica", plano: "SIMPLES", titulo: "Notebook i5 8 GB SSD", texto: "Tela de 15 polegadas, bateria boa, com carregador original.", preco: 180000, moldura: "NENHUMA", estiloTitulo: "SUBLINHADO" },
  { secao: "celulares-e-tablets", plano: "SIMPLES", titulo: "Celular 128 GB seminovo", texto: "Sem marcas de uso, com capa e película. Nota fiscal.", preco: 95000, moldura: "SIMPLES", estiloTitulo: "TARJA" },
  { secao: "moda-e-beleza", plano: "FOTOS", titulo: "Manicure a domicílio", texto: "Mãos e pés, esmaltação em gel. Atendo Plano Piloto e Lago Sul.", preco: 6000, moldura: "TRACEJADA", estiloTitulo: "NEGRITO", alinhamento: "CENTRO", estrelas: true },
  { secao: "agricultura-e-pecuaria", plano: "SIMPLES", titulo: "Vendo esterco curtido", texto: "Saco de 30 kg. Entrego no DF e entorno a partir de 10 sacos.", preco: 2000, moldura: "SIMPLES", estiloTitulo: "NEGRITO" },
  { secao: "pet", plano: "DESTAQUE", titulo: "Doa-se filhotes", texto: "Três filhotes vacinados e vermifugados, porte médio. Só para quem tem quintal.", moldura: "DUPLA", estiloTitulo: "SUBLINHADO", alinhamento: "CENTRO", estrelas: true },
  { secao: "festas-e-eventos", plano: "FOTOS", titulo: "Pula-pula e cama elástica", texto: "Aluguel com montagem e monitor. Fins de semana e feriados.", preco: 25000, moldura: "SIMPLES", estiloTitulo: "TARJA" },
  { secao: "turismo-e-lazer", plano: "SIMPLES", titulo: "Chácara para fim de semana", texto: "Piscina, churrasqueira e campo. Até 30 pessoas, em Sobradinho.", preco: 80000, moldura: "TRACEJADA", estiloTitulo: "NEGRITO" },
  { secao: "musica-arte-e-cultura", plano: "SIMPLES", titulo: "Aulas de violão", texto: "Iniciantes e intermediário. Na sua casa ou online.", preco: 8000, moldura: "NENHUMA", estiloTitulo: "NEGRITO" },
  { secao: "esportes", plano: "FOTOS", titulo: "Bicicleta aro 29", texto: "21 marchas, freio a disco, pouco uso. Revisada.", preco: 110000, moldura: "SIMPLES", estiloTitulo: "SUBLINHADO" },
  { secao: "bebes-e-criancas", plano: "SIMPLES", titulo: "Carrinho de bebê com bebê conforto", texto: "Travel system completo, bem conservado.", preco: 45000, moldura: "SIMPLES", estiloTitulo: "NEGRITO", alinhamento: "CENTRO" },
  { secao: "adulto", plano: "SIMPLES", titulo: "Livros e revistas antigos", texto: "Coleção para maiores de 18 anos. Venda somente para adultos, conforme os termos.", moldura: "TRACEJADA", estiloTitulo: "NEGRITO" },
  { secao: "diversos", plano: "SIMPLES", titulo: "Compro objetos antigos", texto: "Rádios, relógios, máquinas de escrever e louças. Pago à vista.", moldura: "SIMPLES", estiloTitulo: "TARJA", estrelas: true },
]

async function admin() {
  const conta = await prisma.usuario.findFirst({ where: { perfil: "ADMIN" }, select: { id: true } })
  if (!conta) throw new Error("Nenhum administrador no banco.")
  return conta.id
}

async function gol(adminId: string) {
  const c = container()
  const linha = await prisma.anuncio.findUnique({ where: { codigo: CODIGO_DO_GOL } })
  if (!linha) {
    console.log(`• Anúncio ${CODIGO_DO_GOL} não encontrado: nada feito.`)
    return
  }
  // Visual do plano mais caro: moldura dupla, tarja, centralizado e estrelas.
  await prisma.anuncio.update({ where: { id: linha.id }, data: { moldura: "DUPLA", estiloTitulo: "TARJA", alinhamento: "CENTRO", estrelas: true } })
  const noAr = linha.situacao === "PUBLICADO" && linha.planoCodigo === "VITRINE" && linha.expiraEm !== null && linha.expiraEm > new Date()
  if (noAr) {
    console.log(`• Gol já está no ar no plano Vitrine até ${linha.expiraEm?.toISOString()}.`)
    return
  }
  const r = await c.publicarCortesia.executar({ adminId, anuncioId: linha.id, planoCodigo: "VITRINE", dias: 30 })
  console.log(r.ok ? `✔ Gol no ar: plano Vitrine, 30 dias, até ${r.valor.expiraEm.toISOString()}` : `✖ Gol: ${r.mensagem}`)
}

async function exemplos(adminId: string) {
  if (await prisma.usuario.findUnique({ where: { email: EMAIL_DOS_EXEMPLOS } })) {
    console.log("• Exemplos já criados: nada feito.")
    return
  }
  const c = container()
  const dono = await prisma.usuario.create({
    data: {
      nome: "Exemplos do Classificados",
      email: EMAIL_DOS_EXEMPLOS,
      senhaHash: await bcrypt.hash(`exemplo-${Date.now()}-${Math.random()}`, 10),
      celular: "61900000000",
      uf: "DF",
      cidadeCodigo: BRASILIA,
      aceitouTermosEm: new Date(),
    },
  })
  const categorias = new Map((await prisma.categoria.findMany({ select: { id: true, slug: true } })).map((cat) => [cat.slug, cat.id]))
  let publicados = 0
  for (const e of EXEMPLOS) {
    const categoriaId = categorias.get(e.secao)
    if (!categoriaId) {
      console.log(`• Seção ${e.secao} não existe: exemplo pulado.`)
      continue
    }
    const criado = await c.criarAnuncio.executar(
      { id: dono.id, email: dono.email },
      {
        categoriaId,
        uf: "DF",
        cidadeCodigo: BRASILIA,
        titulo: e.titulo,
        texto: `${e.texto} (Anúncio de exemplo.)`,
        precoCentavos: e.preco ?? null,
        estilo: { moldura: e.moldura, estiloTitulo: e.estiloTitulo, alinhamento: e.alinhamento ?? "ESQUERDA", estrelas: e.estrelas ?? false },
        planoCodigo: e.plano,
        dias: 30,
      },
    )
    if (!criado.ok) {
      console.log(`✖ ${e.titulo}: ${criado.mensagem} ${JSON.stringify(criado.campos ?? {})}`)
      continue
    }
    const publicado = await c.publicarCortesia.executar({ adminId, anuncioId: criado.valor.anuncioId, planoCodigo: e.plano, dias: 30 })
    if (publicado.ok) publicados++
    else console.log(`✖ ${e.titulo}: ${publicado.mensagem}`)
  }
  console.log(`✔ ${publicados} exemplo(s) no ar em Brasília/DF por 30 dias (conta ${EMAIL_DOS_EXEMPLOS}).`)
}

async function main() {
  const adminId = await admin()
  await gol(adminId)
  await exemplos(adminId)
}

main()
  .catch((erro) => {
    console.error(erro)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
