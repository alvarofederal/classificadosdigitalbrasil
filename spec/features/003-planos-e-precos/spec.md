# 003 · Planos e tabela de preços

## Spec

**Problema.** Um preço único (R$ 1,00 por 7 dias) não deixa o anunciante pagar por mais visibilidade, e os preços ainda não estão fechados: precisam mudar sem programador.

| ID | Requisito |
|---|---|
| RF-50 | Quatro planos, cada um com período de 7 ou 30 dias: **Simples**, **Com fotos**, **Destaque** e **Vitrine**. |
| RF-51 | O admin edita, em Painel → Planos, nome, descrição, valor de 7 dias, valor de 30 dias, quantidade de fotos e se o plano está à venda. |
| RF-52 | Ao criar o anúncio, o anunciante escolhe plano e período, vendo o valor. Na renovação também. |
| RF-53 | A capa mostra a tabela de planos vigente (RF-45). |

| ID | Regra |
|---|---|
| RN-50 | Ordem na seção: plano de maior prioridade primeiro (Vitrine 3, Destaque 2, Com fotos 1, Simples 0); dentro do mesmo plano, quem pagou por último. |
| RN-51 | O álbum aceita no máximo as fotos do plano do anúncio. |
| RN-52 | Destaque e Vitrine ganham a moldura de destaque (fio grosso) no caderno. Vitrine aparece também na vitrine da capa. |
| RN-53 | A cobrança guarda plano, dias e valor do momento; mudar a tabela não altera cobranças já geradas. |
| RN-54 | O pagamento confirmado define o plano em vigor do anúncio. Pagar um plano diferente troca o plano a partir da confirmação; os dias somam como antes (RN-12). |
| RN-55 | Os quatro códigos de plano são fixos no sistema; o admin muda preço e textos, não cria planos novos nesta versão. |

### Tabela inicial (proposta; os valores mudam no painel)

| Plano | Inclui | 7 dias | 30 dias |
|---|---|---|---|
| Simples | Texto, formatação, mensagem, página própria, 1 foto | R$ 1,00 | R$ 3,00 |
| Com fotos | Tudo do Simples + álbum de 6 fotos | R$ 3,00 | R$ 9,00 |
| Destaque | Tudo do Com fotos + moldura de destaque + aparece antes dos planos menores | R$ 5,00 | R$ 15,00 |
| Vitrine | Tudo do Destaque + topo da seção e vitrine da capa | R$ 10,00 | R$ 30,00 |

Regra dos 30 dias: **mês = 3 semanas** (o plano mensal sai mais barato por dia, ver `07-insights.md`).

## Plano

- Tabela `planos` (código fixo como chave). `anuncios` ganha `planoCodigo` e `prioridade`; `pagamentos` ganha `planoCodigo`. `configuracoes` perde `valorAnuncio` e `diasDePublicacao`.
- Domínio `domain/plano/plano.ts`: catálogo, períodos válidos, valor do período, validação da edição.
- Seed cria os quatro planos só se a tabela estiver vazia.

## Tarefas

- [x] T-50 Modelo, migração e seed dos planos
- [x] T-51 Escolha de plano e período no novo anúncio e na renovação
- [x] T-52 Ordem por prioridade e moldura de destaque
- [x] T-53 Limite de fotos por plano
- [x] T-54 Painel → Planos
