// APLICAÇÃO — contar a visita e montar o que o dono vê (feature 013: RF-130 a RF-133, RN-130 a RN-136; ADR-18).

import { codigoValido, estaNoAr } from "@/domain/anuncio/anuncio"
import {
  type CidadeDasVisitas,
  DIAS_NO_GRAFICO_DA_LISTA,
  DIAS_NO_GRAFICO_DO_ANUNCIO,
  LIMITE_DE_VISITAS_POR_PESSOA_NO_DIA,
  type ResumoDeVisitas,
  cidadesDasVisitas,
  diaDeBrasilia,
  ehRobo,
  localDaVisita,
  normalizarIp,
  resumirVisitas,
  somarDias,
} from "@/domain/anuncio/visitas"
import type { Perfil } from "@/domain/usuario/usuario"
import type { AnuncioRepository } from "../../ports/caderno"
import type { Relogio } from "../../ports/sistema"
import type { AnonimizadorDeVisitante, VisitasQuery, VisitasRepository } from "../../ports/visitas"

export interface EntradaDaVisita {
  codigo: string
  ip: string | null
  navegador: string | null
  /** O que a Vercel informa da conexão (RN-132). */
  local: { cidade?: string | null; regiao?: string | null; pais?: string | null }
  /** Quem está logado, se alguém (RN-130). */
  quemVe: { id: string; perfil: Perfil } | null
}

export type MotivoParaNaoContar = "ROBO" | "FORA_DO_AR" | "DONO" | "ADMIN" | "SEM_IP" | "NO_LIMITE"

export type ResultadoDaVisita =
  | { contada: true; pessoa: "NOVA" | "REPETIDA" | null }
  | { contada: false; motivo: MotivoParaNaoContar }

const naoConta = (motivo: MotivoParaNaoContar): ResultadoDaVisita => ({ contada: false, motivo })

/** RF-130: soma a visita ao total do anúncio e, com o segredo, à pessoa do dia. */
export class RegistrarVisitaUseCase {
  constructor(
    private readonly anuncios: AnuncioRepository,
    private readonly visitas: VisitasRepository,
    private readonly anonimizador: AnonimizadorDeVisitante,
    private readonly relogio: Relogio,
  ) {}

  async executar(entrada: EntradaDaVisita): Promise<ResultadoDaVisita> {
    // RN-130: robôs e prévias de link saem antes de qualquer consulta ao banco.
    if (ehRobo(entrada.navegador)) return naoConta("ROBO")
    const codigo = entrada.codigo.trim().toUpperCase()
    if (!codigoValido(codigo)) return naoConta("FORA_DO_AR")
    const anuncio = await this.anuncios.buscarPorCodigo(codigo)
    const agora = this.relogio.agora()
    if (!anuncio || !estaNoAr(anuncio.situacao, anuncio.expiraEm, agora)) return naoConta("FORA_DO_AR")
    if (entrada.quemVe?.perfil === "ADMIN") return naoConta("ADMIN")
    if (entrada.quemVe?.id === anuncio.usuarioId) return naoConta("DONO")

    const ip = normalizarIp(entrada.ip)
    if (!ip) return naoConta("SEM_IP")
    const chave = this.anonimizador.chave(anuncio.id, ip, (entrada.navegador ?? "").trim())
    if (!chave) {
      // RN-135: sem o segredo, só o total.
      await this.anuncios.somarVisita(anuncio.codigo)
      return { contada: true, pessoa: null }
    }
    const registro = await this.visitas.registrar(
      { anuncioId: anuncio.id, dia: diaDeBrasilia(agora), chave, local: localDaVisita(entrada.local) },
      LIMITE_DE_VISITAS_POR_PESSOA_NO_DIA,
    )
    if (registro === "NO_LIMITE") return naoConta("NO_LIMITE")
    await this.anuncios.somarVisita(anuncio.codigo)
    return { contada: true, pessoa: registro }
  }
}

export interface DetalheDasVisitas {
  resumo: ResumoDeVisitas
  /** Vazio sem o segredo (RN-135). */
  cidades: CidadeDasVisitas[]
}

/** RF-131 a RF-133: o resumo de cada anúncio na lista e o detalhe na tela do anúncio. */
export class ResumirVisitasUseCase {
  constructor(
    private readonly consulta: VisitasQuery,
    private readonly anonimizador: AnonimizadorDeVisitante,
    private readonly relogio: Relogio,
  ) {}

  /** RF-131: um resumo por anúncio, com os últimos 7 dias. */
  async daLista(anuncios: Array<{ id: string; visualizacoes: number }>): Promise<Map<string, ResumoDeVisitas>> {
    return this.resumos(anuncios, DIAS_NO_GRAFICO_DA_LISTA)
  }

  /** RF-132 e RF-133: os últimos 30 dias e as cidades. */
  async doAnuncio(anuncio: { id: string; visualizacoes: number }): Promise<DetalheDasVisitas> {
    const [resumos, cidades] = await Promise.all([
      this.resumos([anuncio], DIAS_NO_GRAFICO_DO_ANUNCIO),
      this.anonimizador.ligado ? this.consulta.cidades(anuncio.id) : Promise.resolve([]),
    ])
    return { resumo: resumos.get(anuncio.id)!, cidades: cidadesDasVisitas(cidades) }
  }

  private async resumos(anuncios: Array<{ id: string; visualizacoes: number }>, quantidadeDeDias: number): Promise<Map<string, ResumoDeVisitas>> {
    const hoje = diaDeBrasilia(this.relogio.agora())
    const ids = anuncios.map((a) => a.id)
    const ligado = this.anonimizador.ligado
    const [porDia, pessoas] = await Promise.all([
      ligado && ids.length > 0 ? this.consulta.porDia(ids, somarDias(hoje, -(Math.max(quantidadeDeDias, 7) - 1))) : Promise.resolve(new Map()),
      ligado && ids.length > 0 ? this.consulta.pessoas(ids) : Promise.resolve(new Map<string, number>()),
    ])
    return new Map(
      anuncios.map((a) => [
        a.id,
        resumirVisitas({ visitas: a.visualizacoes, pessoas: ligado ? (pessoas.get(a.id) ?? 0) : null, linhas: porDia.get(a.id) ?? [], hoje, quantidadeDeDias }),
      ]),
    )
  }
}
