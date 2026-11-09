# 06 · Plano de testes

`npm test` roda os testes de unidade (Vitest), sem banco e sem rede. Os casos de uso rodam contra `tests/fakes.ts` (repositórios e gateway em memória) e o catálogo real do IBGE.

## Cobertos (89 testes, todos passando em 2026-11-09)

| Arquivo | O que verifica |
|---|---|
| `tests/unit/arquitetura.test.ts` | Art. 1: domínio e aplicação não importam framework nem infraestrutura (um teste por arquivo). |
| `tests/unit/dominio.test.ts` | CPF; cadastro; anúncio (normalização, validação, situação, RN-12, código); Pix BR Code (CRC16 `29B1`, montagem, chaves); mensagem; categoria; UF; planos (mês = 3 semanas, Vitrine o mais caro, prioridade, períodos, edição); distância e cidade mais próxima (Brasília, São Paulo, fora do Brasil); chamado (normalização e validação). |
| `tests/unit/casos-de-uso.test.ts` | Anúncio nasce com cobrança; cidade de outra UF e seção desativada recusadas; confirmar publica e renovar soma dias; confirmação dupla recusada; uma cobrança pendente por vez; renovação alheia recusada; Pix estático só com recebedor; edição só do dono; remover cancela pendências; só admin restaura; mensagem só no ar e com limite; cadastro e duplicidades; categoria em uso. |
| `tests/unit/pix-automatico.test.ts` | Vitrine 30 dias = R$ 30,00 com Pix do gateway; período e plano inválidos; gateway fora do ar cai no Pix estático; troca de plano cancela a cobrança anterior; webhook aprovado publica no plano pago com prioridade 3; aviso repetido não confirma duas vezes; valor divergente fica pendente; tela do dono vê quando cai; cortesia com valor zero; fotos por plano (Simples 1, admin 6); tabela editável; chamado com protocolo e limite por hora; localização fora do Brasil; adaptador do Mercado Pago na API de Orders (situação da ordem, centavos, prazo, corpo, idempotência, valor pago, filtro do aviso, assinatura HMAC com id em minúsculas). |

## Conferido em produção (2026-11-09)

Migração aplicada e 4 planos criados no deploy; 19 anúncios no ar em Brasília/DF (Gol no plano Vitrine + 18 exemplos); capa com vitrine, valores e contato; Gol em primeiro na seção Veículos; página do anúncio com conversa, divulgação, cartaz e denúncia; `/a/9TTTMQ` redireciona (308); cartaz com QR; webhook responde e ignora aviso que não é de pagamento; anúncio inexistente mostra "Saiu do caderno".

## Roteiro manual pendente

1. Criar conta de anunciante (outro e-mail) → Novo anúncio → escolher plano e período → Pix.
2. Com o Mercado Pago ligado: pagar R$ 1,00 e ver a tela confirmar sozinha.
3. Painel → Chamados: enviar um contato pela capa e resolver.
4. "Anúncios perto de mim" no celular (permitir a localização).
5. Prévia do link do anúncio colado no WhatsApp.

## Teste de carga (feature 008)

`tests/carga/caderno.js` com k6: leitura (0→50 usuários, 3 min) e pico (200 usuários, 30 s) na página de um anúncio. Metas: p95 < 800 ms, erro < 1%. Rodar só contra ambiente de teste: `k6 run -e BASE=https://… tests/carga/caderno.js`.
