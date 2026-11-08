// DOMÍNIO — Pix "copia e cola" (BR Code estático) com valor e identificador (ADR-07).
// Formato EMV do Banco Central: cada campo é ID (2) + tamanho (2) + valor, fechado por CRC16-CCITT.

import type { ErrosDeCampo } from "../shared/result"
import { semAcentos } from "../shared/texto"

export interface DadosDoPix {
  chave: string
  nomeRecebedor: string
  cidadeRecebedor: string
  valorCentavos: number
  /** Até 25 letras/números. Identifica o pagamento no extrato. */
  identificador: string
}

function campo(id: string, valor: string): string {
  return `${id}${String(valor.length).padStart(2, "0")}${valor}`
}

/** CRC16-CCITT-FALSE (polinômio 0x1021, inicial 0xFFFF), em 4 dígitos hexadecimais maiúsculos. */
export function crc16(texto: string): string {
  let crc = 0xffff
  for (let i = 0; i < texto.length; i++) {
    crc ^= texto.charCodeAt(i) << 8
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0")
}

/** Nome e cidade do recebedor: sem acento, só letras, números e espaço, no tamanho do BR Code. */
export function textoParaPix(texto: string, maximo: number): string {
  return semAcentos(texto)
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
    .slice(0, maximo)
    .trim()
}

const EVP = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** CPF/CNPJ (só números), e-mail, celular com +55 ou chave aleatória. */
export function chavePixValida(chave: string): boolean {
  return (
    /^\d{11}$/.test(chave) ||
    /^\d{14}$/.test(chave) ||
    /^\+55\d{10,11}$/.test(chave) ||
    (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(chave) && chave.length <= 77) ||
    EVP.test(chave)
  )
}

export function validarRecebedorPix(dados: { chave: string; nomeRecebedor: string; cidadeRecebedor: string }, erros: ErrosDeCampo = {}): ErrosDeCampo {
  if (!chavePixValida(dados.chave)) {
    erros.pixChave = "Chave inválida. CPF/CNPJ só números, celular como +5561999999999, e-mail ou chave aleatória."
  }
  if (textoParaPix(dados.nomeRecebedor, 25).length < 2) erros.pixNome = "Informe o nome do recebedor."
  if (textoParaPix(dados.cidadeRecebedor, 15).length < 2) erros.pixCidade = "Informe a cidade do recebedor."
  return erros
}

export function gerarPixCopiaECola(dados: DadosDoPix): string {
  const contaPix = campo("00", "br.gov.bcb.pix") + campo("01", dados.chave.trim())
  const identificador = dados.identificador.replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***"
  const valor = `${Math.floor(dados.valorCentavos / 100)}.${String(dados.valorCentavos % 100).padStart(2, "0")}`

  const semCrc =
    campo("00", "01") +
    campo("26", contaPix) +
    campo("52", "0000") +
    campo("53", "986") +
    campo("54", valor) +
    campo("58", "BR") +
    campo("59", textoParaPix(dados.nomeRecebedor, 25)) +
    campo("60", textoParaPix(dados.cidadeRecebedor, 15)) +
    campo("62", campo("05", identificador)) +
    "6304"

  return semCrc + crc16(semCrc)
}
