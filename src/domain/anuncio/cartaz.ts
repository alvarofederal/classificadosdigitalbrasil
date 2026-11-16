// DOMÍNIO — palavra grande no alto do cartaz A4 do anúncio (feature 019: RF-190, RN-190 a RN-192).

/** Catálogo das palavras do cartaz (Art. 2, O): palavra nova entra aqui, sem `if` na tela. */
export const TITULOS_DO_CARTAZ = {
  "vende-se": "Vende-se",
  "aluga-se": "Aluga-se",
  classificados: "Classificados",
} as const

export type TituloDoCartaz = keyof typeof TITULOS_DO_CARTAZ

/** RN-190: seções em que "vende-se" não faz sentido. */
const SECOES_SEM_VENDA = new Set(["empregos-e-formacao-profissional", "servicos-profissionais", "festas-e-eventos", "turismo-e-lazer", "musica-arte-e-cultura"])

/** RN-190 e RN-192: o que já vem marcado. Para voltar ao cartaz antigo em tudo, devolver "classificados". */
export function tituloPadraoDoCartaz(slugDaSecao: string): TituloDoCartaz {
  return SECOES_SEM_VENDA.has(slugDaSecao) ? "classificados" : "vende-se"
}

/** RN-191: a escolha vem do endereço; valor desconhecido vale como o padrão da seção. */
export function tituloDoCartaz(escolhido: string | null | undefined, slugDaSecao: string): TituloDoCartaz {
  const valor = escolhido?.trim().toLowerCase()
  return valor && Object.hasOwn(TITULOS_DO_CARTAZ, valor) ? (valor as TituloDoCartaz) : tituloPadraoDoCartaz(slugDaSecao)
}
