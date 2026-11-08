// INFRAESTRUTURA — COMPOSITION ROOT. Único lugar que escolhe implementações (Art. 2 — D).

import { AutenticarUsuarioUseCase } from "@/application/use-cases/acesso/autenticar-usuario"
import { AlterarSenhaUseCase, AtualizarPerfilUseCase, CadastrarAnuncianteUseCase } from "@/application/use-cases/acesso/conta"
import { EncerrarSessaoUseCase, ObterSessaoUseCase } from "@/application/use-cases/acesso/sessao"
import {
  AtualizarCategoriaUseCase,
  AtualizarConfiguracaoUseCase,
  CriarCategoriaUseCase,
  RemoverCategoriaUseCase,
} from "@/application/use-cases/admin/administracao"
import {
  CriarAnuncioUseCase,
  EditarAnuncioUseCase,
  RemoverAnuncioUseCase,
  RestaurarAnuncioUseCase,
} from "@/application/use-cases/anuncios/gerenciar-anuncios"
import {
  AdicionarFotosUseCase,
  PrepararUploadDeFotosUseCase,
  RemoverFotoUseCase,
  ReordenarFotosUseCase,
} from "@/application/use-cases/anuncios/gerenciar-fotos"
import { EnviarMensagemUseCase, MarcarMensagensLidasUseCase } from "@/application/use-cases/anuncios/mensagens"
import {
  ConfirmarPagamentoUseCase,
  MontarCobrancaPixUseCase,
  SolicitarRenovacaoUseCase,
} from "@/application/use-cases/pagamentos/pagamentos"
import { CatalogoIbge } from "./localidades/catalogo-ibge"
import { prisma } from "./prisma/cliente"
import { PrismaClassificadosQuery, PrismaMinhaContaQuery, PrismaPainelQuery } from "./prisma/consultas"
import {
  PrismaAnuncioRepository,
  PrismaCategoriaRepository,
  PrismaConfiguracaoRepository,
  PrismaFotoRepository,
  PrismaMensagemRepository,
  PrismaPagamentoRepository,
  PrismaSessaoRepository,
  PrismaTentativaLoginRepository,
  PrismaUsuarioRepository,
} from "./prisma/repositorios"
import { BcryptHashDeSenha, CloudinaryFotoStorage, GeradorDeCodigoAleatorio, RelogioDoSistema, TokenDeSessaoAleatorio } from "./servicos"

function montar() {
  const relogio = new RelogioDoSistema()
  const codigos = new GeradorDeCodigoAleatorio()
  const hash = new BcryptHashDeSenha()
  const tokens = new TokenDeSessaoAleatorio()
  const localidades = new CatalogoIbge()
  const storage = new CloudinaryFotoStorage({
    cloudName: process.env.CLOUDINARY_NAME,
    apiKey: process.env.CLOUDINARY_KEY,
    apiSecret: process.env.CLOUDINARY_SECRET,
    pastaRaiz: process.env.CLOUDINARY_PASTA || "classificadosdigitalbrasil",
  })

  const usuarios = new PrismaUsuarioRepository(prisma)
  const sessoes = new PrismaSessaoRepository(prisma)
  const tentativas = new PrismaTentativaLoginRepository(prisma)
  const categorias = new PrismaCategoriaRepository(prisma)
  const anuncios = new PrismaAnuncioRepository(prisma)
  const fotos = new PrismaFotoRepository(prisma)
  const mensagens = new PrismaMensagemRepository(prisma)
  const pagamentos = new PrismaPagamentoRepository(prisma)
  const configuracao = new PrismaConfiguracaoRepository(prisma)
  const depsDePagamento = { pagamentos, configuracao, codigos, relogio }

  return {
    relogio,
    localidades,
    configuracao,

    autenticar: new AutenticarUsuarioUseCase(usuarios, sessoes, tentativas, hash, tokens, relogio),
    obterSessao: new ObterSessaoUseCase(sessoes, tokens, relogio),
    encerrarSessao: new EncerrarSessaoUseCase(sessoes, tokens),
    cadastrarAnunciante: new CadastrarAnuncianteUseCase(usuarios, sessoes, hash, tokens, localidades, relogio),
    atualizarPerfil: new AtualizarPerfilUseCase(usuarios, localidades),
    alterarSenha: new AlterarSenhaUseCase(usuarios, sessoes, hash, tokens),

    criarAnuncio: new CriarAnuncioUseCase(anuncios, categorias, localidades, codigos, depsDePagamento),
    editarAnuncio: new EditarAnuncioUseCase(anuncios, categorias, localidades),
    removerAnuncio: new RemoverAnuncioUseCase(anuncios, pagamentos),
    restaurarAnuncio: new RestaurarAnuncioUseCase(anuncios),

    prepararUpload: new PrepararUploadDeFotosUseCase(anuncios, fotos, storage),
    adicionarFotos: new AdicionarFotosUseCase(anuncios, fotos, storage),
    reordenarFotos: new ReordenarFotosUseCase(anuncios, fotos),
    removerFoto: new RemoverFotoUseCase(anuncios, fotos, storage),

    enviarMensagem: new EnviarMensagemUseCase(anuncios, mensagens, relogio),
    marcarMensagensLidas: new MarcarMensagensLidasUseCase(anuncios, mensagens),

    solicitarRenovacao: new SolicitarRenovacaoUseCase(anuncios, depsDePagamento),
    confirmarPagamento: new ConfirmarPagamentoUseCase(anuncios, pagamentos, relogio),
    montarCobrancaPix: new MontarCobrancaPixUseCase(configuracao),

    criarCategoria: new CriarCategoriaUseCase(categorias),
    atualizarCategoria: new AtualizarCategoriaUseCase(categorias),
    removerCategoria: new RemoverCategoriaUseCase(categorias),
    atualizarConfiguracao: new AtualizarConfiguracaoUseCase(configuracao),

    classificados: new PrismaClassificadosQuery(prisma),
    minhaConta: new PrismaMinhaContaQuery(prisma),
    painel: new PrismaPainelQuery(prisma),
  }
}

export type Container = ReturnType<typeof montar>

const global_ = globalThis as typeof globalThis & { containerClassificados?: Container }

export function container(): Container {
  global_.containerClassificados ??= montar()
  return global_.containerClassificados
}
