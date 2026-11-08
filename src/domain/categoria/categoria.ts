// DOMÍNIO — categorias são as seções do caderno (Imóveis, Veículos…). RF-30 a RF-32.

import type { ErrosDeCampo } from "../shared/result"
import { kebab, validarTamanho } from "../shared/texto"

export interface Categoria {
  id: string
  nome: string
  slug: string
  ordem: number
  ativa: boolean
}

export interface DadosDaCategoria {
  nome: string
  ordem: number
  ativa: boolean
}

export function slugDaCategoria(nome: string): string {
  return kebab(nome)
}

export function validarCategoria(dados: DadosDaCategoria): ErrosDeCampo {
  const erros: ErrosDeCampo = {}
  validarTamanho(dados.nome.trim(), "nome", "o nome", { min: 2, max: 60 }, erros)
  if (!erros.nome && slugDaCategoria(dados.nome) === "") erros.nome = "Use letras ou números no nome."
  if (!Number.isInteger(dados.ordem) || dados.ordem < 0 || dados.ordem > 999) erros.ordem = "Ordem entre 0 e 999."
  return erros
}

/** As seções iniciais do caderno, na ordem em que aparecem. */
export const CATEGORIAS_INICIAIS = [
  "Imóveis",
  "Veículos",
  "Empregos e Formação Profissional",
  "Serviços Profissionais",
  "Comércio e Negócios",
  "Para Sua Casa",
  "Eletrônicos e Informática",
  "Celulares e Tablets",
  "Moda e Beleza",
  "Agricultura e Pecuária",
  "Pet",
  "Festas e Eventos",
  "Turismo e Lazer",
  "Música, Arte e Cultura",
  "Esportes",
  "Bebês e Crianças",
  "Adulto",
  "Diversos",
] as const
