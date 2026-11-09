# 009 · Tabela de preços por período

**Situação: opção D (meio-termo) aguardando validação do Álvaro (2026-11-09).** Nada disto está no sistema ainda.

## Spec

**Pedido.** Dois produtos e mais períodos:

- Anúncio **simples**: texto, link para a página própria e chat.
- Anúncio **com foto**: o mesmo, com fotos.
- Períodos: **1, 7, 10, 15, 20 e 30 dias**.
- Âncoras dadas: simples R$ 1,00 / 7 dias; com foto R$ 10,00 / 7 dias; simples R$ 25,00 / 30 dias; com foto 30 dias = ?

Destaque e Vitrine saem da venda por enquanto (voltam quando houver anunciantes de verdade).

### Opção A — a proporção das âncoras

Interpolação linear entre 7 e 30 dias; 1 dia com piso de R$ 1,00; com foto = 10 × simples (a razão das âncoras de 7 dias).

| Dias | 1 | 7 | 10 | 15 | 20 | 30 |
|---|---|---|---|---|---|---|
| Simples | R$ 1,00 | R$ 1,00 | R$ 4,00 | R$ 9,50 | R$ 14,50 | R$ 25,00 |
| por dia | 1,00 | 0,14 | 0,40 | 0,63 | 0,73 | 0,83 |
| Com foto | R$ 10,00 | R$ 10,00 | R$ 40,00 | R$ 95,00 | R$ 145,00 | **R$ 250,00** |
| por dia | 10,00 | 1,43 | 4,00 | 6,33 | 7,25 | 8,33 |

**Problema:** o dia fica mais caro quanto mais longo o período. Quem quer 30 dias compra cinco vezes 7 dias: R$ 5,00 em vez de R$ 25,00 (simples) e R$ 50,00 em vez de R$ 250,00 (com foto). E 1 dia custa o mesmo que 7. Os planos de 10 a 30 dias não venderiam.

### Opção B — semana barata, período longo mais barato por dia

Mantém R$ 1,00 e R$ 10,00 por 7 dias. Regra: 30 dias = 3 semanas, e o dia nunca fica mais caro num período maior. O "?" vira R$ 30,00.

| Dias | 7 | 10 | 15 | 20 | 30 |
|---|---|---|---|---|---|
| Simples | R$ 1,00 | R$ 1,40 | R$ 2,00 | R$ 2,50 | R$ 3,00 |
| por dia | 0,14 | 0,14 | 0,13 | 0,13 | 0,10 |
| Com foto | R$ 10,00 | R$ 14,00 | R$ 20,00 | R$ 25,00 | **R$ 30,00** |
| por dia | 1,43 | 1,40 | 1,33 | 1,25 | 1,00 |

1 dia fica de fora: abaixo de R$ 1,00 não compensa cobrar, e a R$ 1,00 custaria o mesmo que 7 dias.

### Opção C — preço por dia perto de R$ 1,00, mês a R$ 25,00, e R$ 1,00 na primeira semana

Mantém os R$ 25,00 do mês. O simples custa perto de R$ 1,00 por dia, com desconto nos períodos maiores. **R$ 1,00 por 7 dias vira a promoção de entrada: a primeira semana do primeiro anúncio de cada conta.**

| Dias | 1 | 7 | 10 | 15 | 20 | 30 |
|---|---|---|---|---|---|---|
| Simples | R$ 1,00 | R$ 6,50 | R$ 9,00 | R$ 13,00 | R$ 17,00 | R$ 25,00 |
| por dia | 1,00 | 0,93 | 0,90 | 0,87 | 0,85 | 0,83 |
| Com foto | R$ 2,00 | R$ 10,00 | R$ 14,00 | R$ 20,00 | R$ 25,00 | **R$ 35,00** |
| por dia | 2,00 | 1,43 | 1,40 | 1,33 | 1,25 | 1,17 |

Aqui o mês de R$ 25,00 vende de verdade (cinco semanas avulsas custariam R$ 32,50), e o "Anuncie por R$ 1,00" continua como chamada.

### Opção D — meio-termo entre B e C (proposta atual, 2026-11-09)

Pedido do Álvaro: ganhar no volume, mas sem o mês barato demais (todo mundo compraria 30 dias, o caderno incha e os anúncios demoram a vencer). Sem 1 dia: a partir de 7.

Regras: o dia nunca fica mais caro num período maior, e o mês sai só um pouco mais barato que 4 semanas avulsas (R$ 1 de diferença no simples, R$ 5 no com foto). Assim cada um compra o período de que precisa.

| Dias | 7 | 10 | 15 | 20 | 30 |
|---|---|---|---|---|---|
| Simples | R$ 4,00 | R$ 5,50 | R$ 8,00 | R$ 10,00 | R$ 15,00 |
| por dia | 0,57 | 0,55 | 0,53 | 0,50 | 0,50 |
| Com foto | R$ 10,00 | R$ 14,00 | R$ 20,00 | R$ 25,00 | R$ 35,00 |
| por dia | 1,43 | 1,40 | 1,33 | 1,25 | 1,17 |

Promoção de entrada (opcional): primeira semana do primeiro anúncio de cada conta por **R$ 1,00**, para manter a chamada "Anuncie por R$ 1".

### Comparação para quem quer 30 dias

| | Simples | Com foto |
|---|---|---|
| A | paga R$ 5,00 (compra semanas) | paga R$ 50,00 (compra semanas) |
| B | R$ 3,00 | R$ 30,00 |
| C | R$ 25,00 | R$ 35,00 |
| D | R$ 15,00 (4 semanas: R$ 16,00) | R$ 35,00 (4 semanas: R$ 40,00) |

## Plano (depois da validação)

- Trocar `planos.valor7Dias/valor30Dias` por uma tabela `precos (planoCodigo, dias, valor)`, com os períodos liberados pelo admin.
- Painel → Planos vira uma grade plano × período.
- Escolha de período no anúncio passa a listar só os períodos com preço.
- Na opção C: regra da primeira semana a R$ 1,00 (uma vez por conta, só no primeiro anúncio).
- Simples sem foto (`maxFotos = 0`); Com foto com 6 fotos. Destaque e Vitrine com `ativo = false`.

## Tarefas

- [ ] T-110 Álvaro valida a opção D (meio-termo) ou ajusta os valores
- [ ] T-111 Tabela `precos` e migração
- [ ] T-112 Grade de preços no painel
- [ ] T-113 Períodos no editor e na renovação
- [ ] T-114 Promoção da primeira semana (se C)
