// INFRAESTRUTURA — COMPOSITION ROOT. Único lugar que escolhe implementações (Art. 2 — D).

import type { Correio } from "@/application/ports/correio"
import { AutenticarUsuarioUseCase } from "@/application/use-cases/acesso/autenticar-usuario"
import { AlterarSenhaUseCase, AtualizarPerfilUseCase, CadastrarAnuncianteUseCase } from "@/application/use-cases/acesso/conta"
import { EncerrarSessaoUseCase, ObterSessaoUseCase } from "@/application/use-cases/acesso/sessao"
import {
  AtualizarCategoriaUseCase,
  AtualizarChamadoUseCase,
  AtualizarConfiguracaoUseCase,
  AtualizarPlanoUseCase,
  CriarCategoriaUseCase,
  EnviarEmailDeTesteUseCase,
  RemoverCategoriaUseCase,
} from "@/application/use-cases/admin/administracao"
import {
  CriarAnuncioUseCase,
  EditarAnuncioUseCase,
  RegistrarVisitaUseCase,
  RemoverAnuncioUseCase,
  RestaurarAnuncioUseCase,
} from "@/application/use-cases/anuncios/gerenciar-anuncios"
import {
  AdicionarFotosUseCase,
  PrepararUploadDeFotosUseCase,
  RemoverFotoUseCase,
  ReordenarFotosUseCase,
} from "@/application/use-cases/anuncios/gerenciar-fotos"
import { AvisarMensagemNovaUseCase, EnviarMensagemUseCase, MarcarMensagensLidasUseCase } from "@/application/use-cases/anuncios/mensagens"
import {
  ConfirmarPagamentoUseCase,
  MontarCobrancaPixUseCase,
  ProcessarPagamentoDoGatewayUseCase,
  PublicarCortesiaUseCase,
  SolicitarRenovacaoUseCase,
  VerificarPagamentoUseCase,
} from "@/application/use-cases/pagamentos/pagamentos"
import { AbrirChamadoUseCase, LocalizarCidadeUseCase } from "@/application/use-cases/publico/publico"
import { CorreioDesligado, CorreioSmtp, lerConfiguracaoDoCorreio } from "./email/correio-smtp"
import { CatalogoIbge } from "./localidades/catalogo-ibge"
import { MercadoPagoGateway, contaDoMercadoPago } from "./pagamentos/mercado-pago"
import { prisma } from "./prisma/cliente"
import { PrismaClassificadosQuery, PrismaMinhaContaQuery, PrismaPainelQuery } from "./prisma/consultas"
import {
  PrismaAnuncioRepository,
  PrismaCategoriaRepository,
  PrismaFotoRepository,
  PrismaMensagemRepository,
  PrismaSessaoRepository,
  PrismaTentativaLoginRepository,
  PrismaUsuarioRepository,
} from "./prisma/repositorios"
import { PrismaChamadoRepository, PrismaConfiguracaoRepository, PrismaPagamentoRepository, PrismaPlanoRepository } from "./prisma/repositorios-pagamento"
import { DepoisDaResposta } from "./segundo-plano"
import { BcryptHashDeSenha, CloudinaryFotoStorage, GeradorDeCodigoAleatorio, RelogioDoSistema, TokenDeSessaoAleatorio } from "./servicos"

/** Endereço público para o aviso do gateway (webhook): o domínio de produção informado pela Vercel. */
function urlDoSiteNoServidor(): string | null {
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  const configurada = process.env.NEXT_PUBLIC_URL?.trim()
  return configurada && !configurada.includes("localhost") ? configurada.replace(/\/$/, "") : null
}

/** Nome que aparece como remetente dos e-mails do site. */
const NOME_DO_REMETENTE = "Classificados Digitais do Brasil"

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
  // Feature 006 (ADR-12): sem o token, volta ao Pix estático com confirmação no painel (RF-83).
  const tokenMercadoPago = process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim()
  const site = urlDoSiteNoServidor()
  const gateway = tokenMercadoPago ? new MercadoPagoGateway(tokenMercadoPago) : null
  // Feature 010 (ADR-15 e ADR-16): SMTP informado ou a chave do Resend (RN-106). Sem nenhum dos dois, o aviso por e-mail
  // fica desligado e nada mais muda (RF-104).
  const smtp = lerConfiguracaoDoCorreio(process.env)
  const correio: Correio = smtp.ok ? new CorreioSmtp(smtp.cfg, NOME_DO_REMETENTE) : new CorreioDesligado()
  const enderecoDoSite = site ?? "http://localhost:3000"

  const usuarios = new PrismaUsuarioRepository(prisma)
  const sessoes = new PrismaSessaoRepository(prisma)
  const tentativas = new PrismaTentativaLoginRepository(prisma)
  const categorias = new PrismaCategoriaRepository(prisma)
  const planos = new PrismaPlanoRepository(prisma)
  const anuncios = new PrismaAnuncioRepository(prisma)
  const fotos = new PrismaFotoRepository(prisma)
  const mensagens = new PrismaMensagemRepository(prisma)
  const pagamentos = new PrismaPagamentoRepository(prisma)
  const configuracao = new PrismaConfiguracaoRepository(prisma)
  const chamados = new PrismaChamadoRepository(prisma)
  const depsDePagamento = { pagamentos, planos, codigos, relogio, gateway }

  const avisarMensagemNova = new AvisarMensagemNovaUseCase(usuarios, mensagens, correio, relogio, {
    mensagensDoAnuncio: (anuncioId) => `${enderecoDoSite}/minha-conta/anuncios/${anuncioId}#titulo-mensagens`,
  })
  const confirmarPagamento = new ConfirmarPagamentoUseCase(anuncios, pagamentos, relogio)
  const processarPagamentoDoGateway = new ProcessarPagamentoDoGatewayUseCase(pagamentos, gateway, confirmarPagamento)

  return {
    relogio,
    localidades,
    configuracao,
    pixAutomatico: gateway !== null,
    /** Painel → Configurações (feature 006): situação da ligação com o Mercado Pago. */
    mercadoPago: {
      urlDoAviso: site ? `${site}/api/pagamentos/mercadopago` : null,
      temSegredoDoAviso: Boolean(process.env.MERCADO_PAGO_WEBHOOK_SECRET?.trim()),
      conta: tokenMercadoPago ? () => contaDoMercadoPago(tokenMercadoPago) : null,
    },
    /** Painel → Configurações (feature 010): situação do aviso por e-mail. A senha nunca sai daqui. */
    correio: {
      ligado: correio.ligado,
      faltam: smtp.ok ? [] : smtp.faltam,
      servidor: smtp.ok ? `${smtp.cfg.host}:${smtp.cfg.porta}` : null,
      remetente: smtp.ok ? `${NOME_DO_REMETENTE} <${smtp.cfg.remetente}>` : null,
      conferir: () => correio.conferir(),
    },

    autenticar: new AutenticarUsuarioUseCase(usuarios, sessoes, tentativas, hash, tokens, relogio),
    obterSessao: new ObterSessaoUseCase(sessoes, tokens, relogio),
    encerrarSessao: new EncerrarSessaoUseCase(sessoes, tokens),
    cadastrarAnunciante: new CadastrarAnuncianteUseCase(usuarios, sessoes, hash, tokens, localidades, relogio),
    atualizarPerfil: new AtualizarPerfilUseCase(usuarios, localidades),
    alterarSenha: new AlterarSenhaUseCase(usuarios, sessoes, hash, tokens),

    criarAnuncio: new CriarAnuncioUseCase(anuncios, categorias, localidades, codigos, depsDePagamento),
    editarAnuncio: new EditarAnuncioUseCase(anuncios, categorias, localidades),
    removerAnuncio: new RemoverAnuncioUseCase(anuncios, pagamentos, gateway),
    restaurarAnuncio: new RestaurarAnuncioUseCase(anuncios),
    registrarVisita: new RegistrarVisitaUseCase(anuncios),

    prepararUpload: new PrepararUploadDeFotosUseCase(anuncios, fotos, storage, planos),
    adicionarFotos: new AdicionarFotosUseCase(anuncios, fotos, storage, planos),
    reordenarFotos: new ReordenarFotosUseCase(anuncios, fotos),
    removerFoto: new RemoverFotoUseCase(anuncios, fotos, storage),

    enviarMensagem: new EnviarMensagemUseCase(anuncios, mensagens, relogio, avisarMensagemNova, new DepoisDaResposta()),
    marcarMensagensLidas: new MarcarMensagensLidasUseCase(anuncios, mensagens),

    solicitarRenovacao: new SolicitarRenovacaoUseCase(anuncios, depsDePagamento),
    confirmarPagamento,
    processarPagamentoDoGateway,
    verificarPagamento: new VerificarPagamentoUseCase(anuncios, pagamentos, processarPagamentoDoGateway),
    publicarCortesia: new PublicarCortesiaUseCase(anuncios, depsDePagamento, confirmarPagamento),
    montarCobrancaPix: new MontarCobrancaPixUseCase(configuracao),

    abrirChamado: new AbrirChamadoUseCase(chamados, codigos, relogio),
    localizarCidade: new LocalizarCidadeUseCase(localidades),

    criarCategoria: new CriarCategoriaUseCase(categorias),
    atualizarCategoria: new AtualizarCategoriaUseCase(categorias),
    removerCategoria: new RemoverCategoriaUseCase(categorias),
    atualizarPlano: new AtualizarPlanoUseCase(planos),
    atualizarConfiguracao: new AtualizarConfiguracaoUseCase(configuracao),
    atualizarChamado: new AtualizarChamadoUseCase(chamados, relogio),
    enviarEmailDeTeste: new EnviarEmailDeTesteUseCase(correio),

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
