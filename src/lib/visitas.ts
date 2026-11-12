// APRESENTAÇÃO — o que a rota das visitas lê da requisição (feature 013: RN-130, RN-132; ADR-18).

/** RN-130: aviso de visita só vale vindo de uma página do próprio site. */
export function vemDoProprioSite(cabecalhos: Headers): boolean {
  const origemDoPedido = cabecalhos.get("sec-fetch-site")
  if (origemDoPedido) return origemDoPedido === "same-origin"
  // Navegador antigo, sem Sec-Fetch-Site: compara a origem com o endereço pedido.
  const origem = cabecalhos.get("origin")
  const endereco = cabecalhos.get("x-forwarded-host") ?? cabecalhos.get("host")
  if (!origem || !endereco) return false
  try {
    return new URL(origem).host === endereco
  } catch {
    return false
  }
}

/** IP da conexão (a Vercel reescreve o `x-forwarded-for`), o navegador e a localização aproximada (RN-132). */
export function dadosDaConexao(cabecalhos: Headers) {
  return {
    ip: cabecalhos.get("x-forwarded-for") ?? cabecalhos.get("x-real-ip"),
    navegador: cabecalhos.get("user-agent"),
    local: {
      cidade: cabecalhos.get("x-vercel-ip-city"),
      regiao: cabecalhos.get("x-vercel-ip-country-region"),
      pais: cabecalhos.get("x-vercel-ip-country"),
    },
  }
}
