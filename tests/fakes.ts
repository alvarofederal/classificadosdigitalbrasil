// Implementações em memória das portas: os casos de uso rodam sem banco, sem rede e sem relógio real.

import type { GeradorDeToken, HashDeSenha, NovoUsuario, SessaoRepository, SessaoValida, UsuarioRegistro, UsuarioRepository } from "@/application/ports/acesso"
import type {
  AnuncioRegistro,
  AnuncioRepository,
  CategoriaRepository,
  Configuracao,
  ConfiguracaoRepository,
  MensagemRepository,
  PagamentoRegistro,
  PagamentoRepository,
} from "@/application/ports/caderno"
import type { GeradorDeCodigo, Relogio } from "@/application/ports/sistema"
import type { Categoria } from "@/domain/categoria/categoria"
import type { NovaMensagem } from "@/domain/mensagem/mensagem"
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
    return Array.from({ length: tamanho }, (_, i) => alfabeto[(this.n * (i + 3)) % alfabeto.length]).join("")
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

export class AnunciosEmMemoria implements AnuncioRepository {
  itens = new Map<string, AnuncioRegistro>()
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
}

export class PagamentosEmMemoria implements PagamentoRepository {
  itens = new Map<string, PagamentoRegistro>()
  constructor(private readonly anuncios: AnunciosEmMemoria) {}
  async buscarPorId(id: string) {
    return this.itens.get(id) ?? null
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
  async cancelarPendentesDoAnuncio(anuncioId: string) {
    for (const p of this.itens.values()) if (p.anuncioId === anuncioId && p.situacao === "PENDENTE") p.situacao = "CANCELADO"
  }
  async confirmarEPublicar(p: PagamentoRegistro, a: AnuncioRegistro) {
    this.itens.set(p.id, p)
    await this.anuncios.atualizar(a)
  }
}

export class ConfiguracaoEmMemoria implements ConfiguracaoRepository {
  cfg: Configuracao = { pixChave: "", pixNome: "", pixCidade: "", valorAnuncioCentavos: 100, diasDePublicacao: 7 }
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

/** Monta o caderno inteiro em memória. */
export function caderno() {
  const relogio = new RelogioFixo()
  const codigos = new CodigosEmSequencia()
  const categorias = new CategoriasEmMemoria()
  const anuncios = new AnunciosEmMemoria()
  const pagamentos = new PagamentosEmMemoria(anuncios)
  const configuracao = new ConfiguracaoEmMemoria()
  const mensagens = new MensagensEmMemoria(relogio)
  return { relogio, codigos, categorias, anuncios, pagamentos, configuracao, mensagens, depsDePagamento: { pagamentos, configuracao, codigos, relogio } }
}
