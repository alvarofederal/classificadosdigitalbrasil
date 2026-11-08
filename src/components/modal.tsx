"use client"

// APRESENTAÇÃO — caixa de diálogo no estilo do jornal (Radix Dialog: foco preso, Esc fecha, leitor de tela).

import * as Dialog from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function Modal({
  aberto,
  aoMudar,
  titulo,
  descricao,
  children,
  largura = "max-w-md",
}: {
  aberto: boolean
  aoMudar: (aberto: boolean) => void
  titulo: string
  descricao?: string
  children: ReactNode
  largura?: string
}) {
  return (
    <Dialog.Root open={aberto} onOpenChange={aoMudar}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 max-h-[92dvh] w-[calc(100%-1.5rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto border-2 border-tinta bg-papel p-5 shadow-[6px_6px_0_0_#141412] focus:outline-none",
            largura,
          )}
        >
          <div className="mb-4 flex items-start justify-between gap-3 border-b-2 border-tinta pb-2">
            <div>
              <Dialog.Title className="font-titulo text-xl font-bold uppercase tracking-wide">{titulo}</Dialog.Title>
              {descricao ? (
                <Dialog.Description className="mt-0.5 text-sm text-tinta-suave">{descricao}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{titulo}</Dialog.Description>
              )}
            </div>
            <Dialog.Close className="-mr-1 -mt-1 inline-flex size-9 shrink-0 items-center justify-center hover:bg-papel-escuro" aria-label="Fechar">
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
