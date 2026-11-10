// INFRAESTRUTURA — trabalho depois da resposta (feature 010: RF-102, RN-100).
// O `after` do Next segura a função viva até a tarefa terminar, sem atrasar quem fez o pedido.

import { after } from "next/server"
import type { SegundoPlano } from "@/application/ports/sistema"

export class DepoisDaResposta implements SegundoPlano {
  executar(tarefa: () => Promise<unknown>): void {
    const protegida = async () => {
      try {
        await tarefa()
      } catch (erro) {
        console.error("[segundo plano] a tarefa falhou", erro)
      }
    }
    try {
      after(protegida)
    } catch {
      // Fora de um pedido do Next (script, teste) não existe "depois da resposta": roda já, sem esperar.
      void protegida()
    }
  }
}
