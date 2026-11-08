// APLICAÇÃO — portas de sistema. Casos de uso nunca chamam `new Date()` nem `crypto` direto.

export interface Relogio {
  agora(): Date
}

export interface GeradorDeCodigo {
  /** Código aleatório com as letras do alfabeto informado. */
  codigo(alfabeto: string, tamanho: number): string
}
