// APLICAÇÃO — porta do correio eletrônico (feature 010, ADR-15). A infraestrutura escolhe o servidor de envio.

import type { Carta, Destinatario } from "@/domain/shared/carta"
import type { Result } from "@/domain/shared/result"

export interface Correio {
  /** Falso quando falta o servidor de envio: nada sai e o site segue como antes (RF-104). */
  readonly ligado: boolean
  /** Entrega a carta. Nunca lança: servidor fora do ar ou endereço recusado voltam como falha (RN-100). */
  enviar(para: Destinatario, carta: Carta): Promise<Result<{ id: string }>>
  /** Abre a conexão e faz o login, sem enviar nada (Painel → Configurações, RF-103). */
  conferir(): Promise<Result<true>>
}

/** Endereços do site que os avisos citam. As rotas são da apresentação; o container entrega os endereços prontos. */
export interface EnderecosDoSite {
  /** Lista de mensagens de um anúncio em Minha conta. */
  mensagensDoAnuncio(anuncioId: string): string
  /** O anúncio em Minha conta, onde o dono renova (feature 012). */
  anuncioEmMinhaConta(anuncioId: string): string
  /** Página pública do anúncio. */
  paginaDoAnuncio(codigo: string): string
  /** Formulário de contato com o administrador (feature 016, aviso de troca de e-mail). */
  contato(): string
  /** A pergunta "Fechou negócio?" na tela do anúncio em Minha conta (feature 021). */
  resultadoDoAnuncio(anuncioId: string): string
  /** A página do convite (feature 015, RF-253). */
  convite(codigo: string): string
  /** A página de continuar ou desistir do cadastro, com a escolha marcada (feature 024, RF-241, RF-242). */
  continuarCadastro(codigo: string, escolha: "continuar" | "desistir"): string
}
