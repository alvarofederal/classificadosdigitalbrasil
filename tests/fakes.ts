// Implementações em memória das portas: os casos de uso rodam sem banco, sem rede e sem relógio real.

import type { GeradorDeToken, HashDeSenha, NovoUsuario, SessaoRepository, SessaoValida, UsuarioRegistro, UsuarioRepository } from "@/application/ports/acesso"
import type {
  AnuncioAVencer,
  AnuncioRegistro,
  AnuncioRepository,
  AvisosDeVencimentoRepository,
  CancelamentoNoGateway,
  CategoriaRepository,
  ChamadoRegistro,
  ChamadoRepository,
  CobrancaNoGateway,
  Configuracao,
  ConfiguracaoRepository,
  FotoRegistro,
  FotoRepository,
  FotoStorage,
  GatewayPix,
  MensagemRepository,
  NovaFoto,
  PagamentoNoGateway,
  PagamentoRegistro,
  PagamentoRepository,
  PlanoRepository,
} from "@/application/ports/caderno"
import type { Correio, EnderecosDoSite } from "@/application/ports/correio"
import type { GeradorDeCodigo, Relogio, SegundoPlano } from "@/application/ports/sistema"
import type { Categoria } from "@/domain/categoria/categoria"
import type { NovaMensagem } from "@/domain/mensagem/mensagem"
import { PLANOS_INICIAIS, type Plano } from "@/domain/plano/plano"
import type { Carta, Destinatario } from "@/domain/shared/carta"
import { type Result, falha, ok } from "@/domain/shared/result"
import { CatalogoIbge } from "@/infrastructure/localidades/catalogo-ibge"

export class RelogioFixo implements Relogio {
  constructor(public instante = new Date("2026-11-08T12:00:00Z")) {}
  agora() {
    return new Date(this.instante)
  }
  avancarDias(dias: number) {
    this.instante = new Date(this.instante.getTime() + dias * 86_400_000)
  }
}

export class CodigosEmSequencia implements GeradorDeCodigo {
  private n = 0
  codigo(alfabeto: string, tamanho: number) {
    this.n++
    return Array.from({ length: tamanho }, (_, i) => alfabeto[(this.n * (i + 3) + i) % alfabeto.length]).join("")
  }
}

let proximoId = 0
const novoId = () => `id-${++proximoId}`

export class CategoriasEmMemoria implements CategoriaRepository {
  itens: Categoria[] = [
    { id: "cat-veiculos", nome: "Veículos", slug: "veiculos", ordem: 10, ativa: true },
    { id: "cat-antiga", nome: "Antiga", slug: "antiga", ordem: 20, ativa: false },
  ]
  anunciosPorCategoria = new Map<string, number>()
  async listar() {
    return this.itens
  }
  async buscarPorId(id: string) {
    return this.itens.find((c) => c.id === id) ?? null
  }
  async existeSlug(slug: string, excetoId?: string) {
    return this.itens.some((c) => c.slug === slug && c.id !== excetoId)
  }
  async inserir(c: Omit<Categoria, "id">) {
    const id = novoId()
    this.itens.push({ id, ...c })
    return id
  }
  async atualizar(c: Categoria) {
    this.itens = this.itens.map((x) => (x.id === c.id ? c : x))
  }
  async remover(id: string) {
    this.itens = this.itens.filter((c) => c.id !== id)
  }
  async contarAnuncios(id: string) {
    return this.anunciosPorCategoria.get(id) ?? 0
  }
}

export class PlanosEmMemoria implements PlanoRepository {
  itens: Plano[] = PLANOS_INICIAIS.map((p) => ({ ...p }))
  async listar() {
    return this.itens
  }
  async buscar(codigo: string) {
    return this.itens.find((p) => p.codigo === codigo) ?? null
  }
  async salvar(plano: Plano) {
    this.itens = this.itens.map((p) => (p.codigo === plano.codigo ? plano : p))
  }
}

export class AnunciosEmMemoria implements AnuncioRepository {
  itens = new Map<string, AnuncioRegistro>()
  visitas = new Map<string, number>()
  async buscarPorId(id: string) {
    return this.itens.get(id) ?? null
  }
  async existeCodigo(codigo: string) {
    return [...this.itens.values()].some((a) => a.codigo === codigo)
  }
  async inserir(a: Omit<AnuncioRegistro, "id">) {
    const id = novoId()
    this.itens.set(id, { id, ...a })
    return id
  }
  async atualizar(a: AnuncioRegistro) {
    this.itens.set(a.id, a)
  }
  async somarVisita(codigo: string) {
    this.visitas.set(codigo, (this.visitas.get(codigo) ?? 0) + 1)
  }
}

export class PagamentosEmMemoria implements PagamentoRepository {
  itens = new Map<string, PagamentoRegistro>()
  constructor(private readonly anuncios: AnunciosEmMemoria) {}
  async buscarPorId(id: string) {
    return this.itens.get(id) ?? null
  }
  async buscarPorCodigo(codigo: string) {
    return [...this.itens.values()].find((p) => p.codigo === codigo) ?? null
  }
  async pendenteDoAnuncio(anuncioId: string) {
    return [...this.itens.values()].find((p) => p.anuncioId === anuncioId && p.situacao === "PENDENTE") ?? null
  }
  async existeCodigo(codigo: string) {
    return [...this.itens.values()].some((p) => p.codigo === codigo)
  }
  async inserir(p: Omit<PagamentoRegistro, "id">) {
    const id = novoId()
    this.itens.set(id, { id, ...p })
    return id
  }
  async cancelar(id: string) {
    const p = this.itens.get(id)
    if (p && p.situacao === "PENDENTE") p.situacao = "CANCELADO"
  }
  async cancelarPendentesDoAnuncio(anuncioId: string) {
    for (const p of this.itens.values()) if (p.anuncioId === anuncioId && p.situacao === "PENDENTE") p.situacao = "CANCELADO"
  }
  async confirmarEPublicar(p: PagamentoRegistro, a: AnuncioRegistro) {
    if (this.itens.get(p.id)?.situacao !== "PENDENTE") return false
    this.itens.set(p.id, p)
    await this.anuncios.atualizar(a)
    return true
  }
}

/** Gateway de mentira: guarda as cobranças e deixa o teste dizer o que "foi pago". */
export class GatewayFalso implements GatewayPix {
  readonly nome = "MERCADO_PAGO" as const
  cobrancas: Array<{ gatewayId: string; referencia: string; valorCentavos: number }> = []
  pagamentos = new Map<string, PagamentoNoGateway>()
  falhar = false
  async criarCobranca(params: { referencia: string; valorCentavos: number; vencimentoEm: Date }): Promise<CobrancaNoGateway> {
    if (this.falhar) throw new Error("gateway fora do ar")
    const gatewayId = String(1000 + this.cobrancas.length)
    this.cobrancas.push({ gatewayId, referencia: params.referencia, valorCentavos: params.valorCentavos })
    this.pagamentos.set(gatewayId, { gatewayId, situacao: "PENDENTE", valorCentavos: params.valorCentavos, referencia: params.referencia })
    return { gatewayId, copiaECola: `00020126-pix-${params.referencia}`, vencimentoEm: params.vencimentoEm }
  }
  async consultar(gatewayId: string) {
    const p = this.pagamentos.get(gatewayId)
    if (!p) throw new Error("não encontrado")
    return p
  }
  pagar(gatewayId: string, valorCentavos?: number) {
    const p = this.pagamentos.get(gatewayId)!
    this.pagamentos.set(gatewayId, { ...p, situacao: "APROVADO", valorCentavos: valorCentavos ?? p.valorCentavos })
  }
  canceladas: string[] = []
  falharAoCancelar = false
  async cancelar(gatewayId: string): Promise<CancelamentoNoGateway> {
    if (this.falharAoCancelar) return "FALHOU"
    const p = this.pagamentos.get(gatewayId)
    if (!p) return "CANCELADA"
    if (p.situacao === "APROVADO") return "JA_PAGA"
    this.pagamentos.set(gatewayId, { ...p, situacao: "RECUSADO" })
    this.canceladas.push(gatewayId)
    return "CANCELADA"
  }
}

export class ConfiguracaoEmMemoria implements ConfiguracaoRepository {
  cfg: Configuracao = { pixChave: "", pixNome: "", pixCidade: "" }
  async obter() {
    return this.cfg
  }
  async salvar(cfg: Configuracao) {
    this.cfg = cfg
  }
}

export class MensagensEmMemoria implements MensagemRepository {
  itens: Array<NovaMensagem & { anuncioId: string; criadoEm: Date; lida: boolean }> = []
  constructor(private readonly relogio: Relogio) {}
  async inserir(anuncioId: string, m: NovaMensagem) {
    this.itens.push({ ...m, anuncioId, criadoEm: this.relogio.agora(), lida: false })
  }
  async contarDoContatoDesde(anuncioId: string, contato: string, desde: Date) {
    return this.itens.filter((m) => m.anuncioId === anuncioId && m.contato === contato && m.criadoEm >= desde).length
  }
  async contarDoAnuncioDesde(anuncioId: string, desde: Date) {
    return this.itens.filter((m) => m.anuncioId === anuncioId && m.criadoEm >= desde).length
  }
  async marcarComoLidas(anuncioId: string) {
    for (const m of this.itens) if (m.anuncioId === anuncioId) m.lida = true
  }
}

/** Correio de mentira: guarda as cartas "enviadas" e deixa o teste desligar o servidor ou derrubá-lo. */
export class CorreioFalso implements Correio {
  ligado = true
  falhar = false
  enviadas: Array<{ para: Destinatario; carta: Carta }> = []
  async enviar(para: Destinatario, carta: Carta): Promise<Result<{ id: string }>> {
    if (this.falhar) return falha("ENVIO_FALHOU", "servidor de e-mail fora do ar")
    this.enviadas.push({ para, carta })
    return ok({ id: `email-${this.enviadas.length}` })
  }
  async conferir(): Promise<Result<true>> {
    return this.falhar ? falha("CONEXAO_FALHOU", "servidor de e-mail fora do ar") : ok(true)
  }
}

/** Segundo plano de teste: guarda as tarefas e só roda quando o teste manda, como o "depois da resposta". */
export class SegundoPlanoManual implements SegundoPlano {
  private fila: Array<() => Promise<unknown>> = []
  get pendentes() {
    return this.fila.length
  }
  executar(tarefa: () => Promise<unknown>) {
    this.fila.push(tarefa)
  }
  /** Roda o que ficou para depois. Erro de tarefa não volta para quem chamou, como em produção. */
  async concluir() {
    const tarefas = this.fila
    this.fila = []
    for (const tarefa of tarefas) await tarefa().catch(() => undefined)
  }
}

export const enderecosDeTeste: EnderecosDoSite = {
  mensagensDoAnuncio: (anuncioId) => `https://classificados.teste/minha-conta/anuncios/${anuncioId}#titulo-mensagens`,
  anuncioEmMinhaConta: (anuncioId) => `https://classificados.teste/minha-conta/anuncios/${anuncioId}`,
  paginaDoAnuncio: (codigo) => `https://classificados.teste/anuncio/${codigo}`,
}

/** Feature 012: anúncios com dono e a marca do aviso de vencimento (`avisadoPara`). */
export class AvisosDeVencimentoEmMemoria implements AvisosDeVencimentoRepository {
  itens: Array<AnuncioAVencer & { noAr: boolean; avisadoPara: Date | null }> = []
  /** Simula outra rodada que marcou o anúncio entre a busca e a marca. */
  outraRodadaMarcou = new Set<string>()

  adicionar(anuncio: Partial<AnuncioAVencer> & Pick<AnuncioAVencer, "id" | "expiraEm">, extra: { noAr?: boolean; avisadoPara?: Date | null } = {}) {
    this.itens.push({
      codigo: anuncio.id.toUpperCase().padEnd(6, "X").slice(0, 6),
      titulo: "Vendo Gol 2010",
      visualizacoes: 0,
      dono: { nome: "Álvaro Federal", email: "dono@exemplo.com.br", ativo: true },
      ...anuncio,
      noAr: extra.noAr ?? true,
      avisadoPara: extra.avisadoPara ?? null,
    })
  }

  async aVencer(agora: Date, ate: Date, limite: number) {
    return this.itens
      .filter((a) => a.noAr && a.expiraEm > agora && a.expiraEm <= ate && a.avisadoPara?.getTime() !== a.expiraEm.getTime())
      .sort((a, b) => a.expiraEm.getTime() - b.expiraEm.getTime())
      .slice(0, limite)
      .map(({ noAr: _noAr, avisadoPara: _avisadoPara, ...anuncio }) => anuncio)
  }

  async marcarAvisado(anuncioId: string, expiraEm: Date) {
    const anuncio = this.itens.find((a) => a.id === anuncioId)
    if (!anuncio || anuncio.expiraEm.getTime() !== expiraEm.getTime()) return false
    if (this.outraRodadaMarcou.has(anuncioId)) anuncio.avisadoPara = expiraEm
    if (anuncio.avisadoPara?.getTime() === expiraEm.getTime()) return false
    anuncio.avisadoPara = expiraEm
    return true
  }

  async desmarcar(anuncioId: string, expiraEm: Date) {
    const anuncio = this.itens.find((a) => a.id === anuncioId)
    if (anuncio?.avisadoPara?.getTime() === expiraEm.getTime()) anuncio.avisadoPara = null
  }
}

export class FotosEmMemoria implements FotoRepository {
  itens: FotoRegistro[] = []
  async listar(anuncioId: string) {
    return this.itens.filter((f) => f.anuncioId === anuncioId)
  }
  async adicionar(anuncioId: string, fotos: NovaFoto[]) {
    for (const f of fotos) this.itens.push({ id: novoId(), anuncioId, url: f.url, publicId: f.publicId, ordem: this.itens.length })
  }
  async reordenar() {}
  async remover(fotoId: string) {
    this.itens = this.itens.filter((f) => f.id !== fotoId)
  }
}

export const storageFalso: FotoStorage = {
  pastaDoAnuncio: (id) => `teste/anuncios/${id}`,
  assinarUploads: (_pasta, quantidade) => Array.from({ length: quantidade }, () => ({ url: "https://api.cloudinary.com/upload", campos: {} })),
  pertenceAPasta: (foto, pasta) => foto.publicId.startsWith(`${pasta}/`),
  remover: async () => undefined,
}

export class ChamadosEmMemoria implements ChamadoRepository {
  itens: ChamadoRegistro[] = []
  async inserir(c: Omit<ChamadoRegistro, "id">) {
    const id = novoId()
    this.itens.push({ id, ...c })
    return id
  }
  async existeProtocolo(protocolo: string) {
    return this.itens.some((c) => c.protocolo === protocolo)
  }
  async contarDoEmailDesde(email: string, desde: Date) {
    return this.itens.filter((c) => c.email === email && c.criadoEm >= desde).length
  }
  async buscarPorId(id: string) {
    return this.itens.find((c) => c.id === id) ?? null
  }
  async atualizar(c: ChamadoRegistro) {
    this.itens = this.itens.map((x) => (x.id === c.id ? c : x))
  }
}

export class UsuariosEmMemoria implements UsuarioRepository {
  itens = new Map<string, UsuarioRegistro>()
  async buscarPorId(id: string) {
    return this.itens.get(id) ?? null
  }
  async buscarPorEmail(email: string) {
    return [...this.itens.values()].find((u) => u.email === email) ?? null
  }
  async existeEmail(email: string, exceto?: string) {
    return [...this.itens.values()].some((u) => u.email === email && u.id !== exceto)
  }
  async existeCpf(cpf: string) {
    return [...this.itens.values()].some((u) => u.cpf === cpf)
  }
  async inserir(u: NovoUsuario) {
    const id = novoId()
    this.itens.set(id, { id, ...u })
    return id
  }
  async atualizar(u: UsuarioRegistro) {
    this.itens.set(u.id, u)
  }
  async registrarAcesso() {}
}

export class SessoesEmMemoria implements SessaoRepository {
  itens: Array<{ id: string; usuarioId: string; tokenHash: string; expiraEm: Date }> = []
  async criar(p: { usuarioId: string; tokenHash: string; expiraEm: Date }) {
    this.itens.push({ id: novoId(), ...p })
  }
  async buscarValida(): Promise<SessaoValida | null> {
    return null
  }
  async renovar() {}
  async remover(tokenHash: string) {
    this.itens = this.itens.filter((s) => s.tokenHash !== tokenHash)
  }
  async removerTodasDoUsuario(usuarioId: string, exceto?: string) {
    this.itens = this.itens.filter((s) => s.usuarioId !== usuarioId || s.tokenHash === exceto)
  }
}

export const hashFalso: HashDeSenha = {
  gerar: async (s) => `hash:${s}`,
  comparar: async (s, h) => h === `hash:${s}`,
}

export const tokensFalsos: GeradorDeToken = {
  novoToken: () => `token-${novoId()}`,
  hash: (t) => `h(${t})`,
}

export const localidades = new CatalogoIbge()

/** Monta o caderno inteiro em memória. Com `gateway`, o Pix é automático. */
export function caderno({ comGateway = false } = {}) {
  const relogio = new RelogioFixo()
  const codigos = new CodigosEmSequencia()
  const categorias = new CategoriasEmMemoria()
  const planos = new PlanosEmMemoria()
  const anuncios = new AnunciosEmMemoria()
  const pagamentos = new PagamentosEmMemoria(anuncios)
  const configuracao = new ConfiguracaoEmMemoria()
  const mensagens = new MensagensEmMemoria(relogio)
  const fotos = new FotosEmMemoria()
  const gateway = comGateway ? new GatewayFalso() : null
  const usuarios = new UsuariosEmMemoria()
  const correio = new CorreioFalso()
  const segundoPlano = new SegundoPlanoManual()
  return {
    relogio,
    codigos,
    categorias,
    planos,
    anuncios,
    pagamentos,
    configuracao,
    mensagens,
    fotos,
    gateway,
    usuarios,
    correio,
    segundoPlano,
    depsDePagamento: { pagamentos, planos, codigos, relogio, gateway },
  }
}
