// APLICAÇÃO — portas de sistema. Casos de uso nunca chamam `new Date()` nem `crypto` direto.

export interface Relogio {
  agora(): Date
}

export interface GeradorDeCodigo {
  /** Código aleatório com as letras do alfabeto informado. */
  codigo(alfabeto: string, tamanho: number): string
}

export interface SegundoPlano {
  /**
   * Roda a tarefa sem segurar a resposta de quem pediu (RF-102).
   * O erro da tarefa fica no log e nunca volta para quem chamou (RN-100).
   */
  executar(tarefa: () => Promise<unknown>): void
}
