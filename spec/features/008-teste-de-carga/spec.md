# 008 · Teste de carga

## Spec

Saber até onde a plataforma aguenta antes de crescer: quantos acessos por segundo o caderno de uma cidade suporta, e em que ponto o banco da Hostinger vira gargalo.

## Ferramenta: k6 (equivalente ao JMeter no mundo JavaScript)

- **k6** (Grafana): scripts em JavaScript, roda pela linha de comando, gera relatório de tempo de resposta (p95, p99), erros e requisições por segundo. Instalação no Windows: `winget install k6 --source winget`.
- Alternativas: **Artillery** (YAML/JS, `npx artillery`) e **autocannon** (bombardeio rápido de uma URL).

## Cenários (script `tests/carga/caderno.js`)

1. **Leitura**: capa, caderno da cidade e seção, rampa de 0 a 50 usuários virtuais em 1 minuto, 3 minutos estável.
2. **Pico**: 200 usuários por 30 segundos na página de um anúncio (simula um post viralizando).
3. **Escrita** (só em banco de teste): cadastro e criação de anúncio.

Metas iniciais: p95 abaixo de 800 ms na leitura e erro abaixo de 1%.

**Cuidado:** rodar contra produção derruba o site para os usuários de verdade e consome o limite da Vercel e do MySQL. O teste de escrita nunca roda no banco de produção.

## Tarefas

- [x] T-100 Script k6 de leitura e pico
- [ ] T-101 Rodar contra uma cópia (preview com banco de teste) e anotar os números
