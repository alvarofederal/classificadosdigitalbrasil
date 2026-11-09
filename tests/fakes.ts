// Implementações em memória das portas: os casos de uso rodam sem banco, sem rede e sem relógio real.

import type { GeradorDeToken, HashDeSenha, NovoUsuario, SessaoRepository, SessaoValida, UsuarioRegistro, UsuarioRepository } from "@/application/ports/acesso"
import type {
  AnuncioRegistro,
  AnuncioRepository,
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
import type { GeradorDeCodigo, Relogio } from "@/application/ports/sistema"
import type { Categoria } from "@/domain/categoria/categoria"
import type { NovaMensagem } from "@/domain/mensagem/mensagem"
import { PLANOS_INICIAIS, type Plano } from "@/domain/plano/plano"
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
  async marcarComoLidas(anuncioId: string) {
    for (const m of this.itens) if (m.anuncioId === anuncioId) m.lida = true
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
    depsDePagamento: { pagamentos, planos, codigos, relogio, gateway },
  }
}
