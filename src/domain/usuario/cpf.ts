// DOMÍNIO — CPF: validação pelos dígitos verificadores e exibição mascarada (RN-02, LGPD).

import { somenteDigitos } from "../shared/texto"

function digitoVerificador(base: string): number {
  let soma = 0
  for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (base.length + 1 - i)
  const resto = (soma * 10) % 11
  return resto === 10 ? 0 : resto
}

export function cpfValido(valor: string): boolean {
  const cpf = somenteDigitos(valor)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
  return digitoVerificador(cpf.slice(0, 9)) === Number(cpf[9]) && digitoVerificador(cpf.slice(0, 10)) === Number(cpf[10])
}

export function formatarCpf(cpf: string): string {
  const d = somenteDigitos(cpf)
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : cpf
}

/** Só o miolo aparece: ***.456.789-** — o suficiente para o próprio dono reconhecer. */
export function mascararCpf(cpf: string): string {
  const d = somenteDigitos(cpf)
  return d.length === 11 ? `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**` : "***"
}
