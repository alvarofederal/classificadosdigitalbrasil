// Teste de carga com k6 (feature 008). Equivalente ao JMeter, em JavaScript.
// Instalar no Windows:  winget install k6 --source winget
// Rodar:                k6 run -e BASE=https://endereco-de-teste tests/carga/caderno.js
// NÃO rode contra produção: derruba o site para quem está usando e consome o limite da Vercel e do MySQL.

import { check, sleep } from "k6"
import http from "k6/http"

const BASE = __ENV.BASE || "http://localhost:3000"
const CIDADE = __ENV.CIDADE || "/df/brasilia"
const SECAO = __ENV.SECAO || "/df/brasilia/veiculos"
const ANUNCIO = __ENV.ANUNCIO || "/anuncio/9TTTMQ"

export const options = {
  scenarios: {
    // 1. Leitura: rampa de 0 a 50 usuários em 1 min, 3 min estável, descida.
    leitura: {
      executor: "ramping-vus",
      exec: "leitura",
      stages: [
        { duration: "1m", target: 50 },
        { duration: "3m", target: 50 },
        { duration: "30s", target: 0 },
      ],
    },
    // 2. Pico: 200 usuários por 30 s na página de um anúncio (post viralizando).
    pico: {
      executor: "constant-vus",
      exec: "pico",
      vus: 200,
      duration: "30s",
      startTime: "5m",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<800"],
    http_req_failed: ["rate<0.01"],
  },
}

export function leitura() {
  for (const caminho of ["/", CIDADE, SECAO]) {
    const r = http.get(`${BASE}${caminho}`)
    check(r, { [`${caminho} 200`]: (res) => res.status === 200 })
    sleep(1 + Math.random() * 2)
  }
}

export function pico() {
  const r = http.get(`${BASE}${ANUNCIO}`)
  check(r, { "anúncio 200": (res) => res.status === 200 })
  sleep(1)
}
