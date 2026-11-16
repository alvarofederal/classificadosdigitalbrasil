// APLICAÇÃO — porta dos convites (feature 015, ADR-22).

import type { CanalDoConvite } from "@/domain/convite/convite"

export interface ConviteRegistro {
  id: string
  convidanteId: string
  canal: CanalDoConvite
  /** Só no convite por e-mail (RN-252). */
  emailDestino: string | null
  /** RN-256: só o hash do código do link. */
  codigoHash: string
  criadoEm: Date
  expiraEm: Date
  aceitoPorId: string | null
  aceitoEm: Date | null
  premiadoEm: Date | null
  canceladoEm: Date | null
}

export interface ConviteRepository {
  inserir(convite: Omit<ConviteRegistro, "id">): Promise<string>
  doConvidante(convidanteId: string): Promise<ConviteRegistro[]>
  porCodigoHash(codigoHash: string): Promise<ConviteRegistro | null>
  /** Liga a conta nova ao convite só se ninguém aceitou nem cancelou antes (atualização condicionada). */
  aceitar(id: string, usuarioId: string, quando: Date): Promise<boolean>
  /** O convite que esta conta aceitou, se houver. */
  aceitoPor(usuarioId: string): Promise<ConviteRegistro | null>
  /** RN-254: marca o prêmio uma vez só (atualização condicionada). */
  premiar(id: string, quando: Date): Promise<boolean>
  /** RF-255: cancela só se ainda não foi aceito nem cancelado, e se é de quem pede. */
  cancelar(id: string, convidanteId: string, quando: Date): Promise<boolean>
}

/** Avisada quando um anúncio vai ao ar pela primeira vez (o prêmio do convite, RF-254). */
export interface AoPublicarPelaPrimeiraVez {
  aoPublicar(usuarioId: string): Promise<void>
}
