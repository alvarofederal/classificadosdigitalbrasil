// DOMÍNIO — utilitários de texto usados pelas regras (sem framework).

/** Remove espaços das pontas e devolve null para texto vazio. */
export function textoOpcional(valor: string | null | undefined): string | null {
  const limpo = (valor ?? "").trim()
  return limpo.length > 0 ? limpo : null
}

export function semAcentos(valor: string): string {
  return valor.normalize("NFD").replace(/[̀-ͯ]/g, "")
}

export function kebab(...partes: Array<string | number | null | undefined>): string {
  return semAcentos(partes.filter((p) => p !== null && p !== undefined && `${p}`.trim() !== "").join(" "))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, "")
}

export function validarTamanho(
  valor: string | null,
  campo: string,
  rotulo: string,
  { min = 0, max }: { min?: number; max: number },
  erros: Record<string, string>,
): void {
  const tamanho = valor?.length ?? 0
  if (min > 0 && tamanho === 0) erros[campo] = `Informe ${rotulo}.`
  else if (tamanho > 0 && tamanho < min) erros[campo] = `${capitalizar(rotulo)}: mínimo de ${min} caracteres.`
  else if (tamanho > max) erros[campo] = `${capitalizar(rotulo)}: máximo de ${max} caracteres.`
}

function capitalizar(texto: string): string {
  const semArtigo = texto.replace(/^(o|a|os|as) /, "")
  return semArtigo.charAt(0).toUpperCase() + semArtigo.slice(1)
}
