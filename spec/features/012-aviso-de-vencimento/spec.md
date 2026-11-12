# 012 · Aviso de vencimento por e-mail

## Spec

**Problema.** O anúncio sai do caderno sozinho no fim do prazo (RN-13), e ninguém avisa o dono. Quem esquece não renova, e o site perde a receita mais barata de conseguir: a de quem já anunciou. O primeiro caso é o Astra do Álvaro, no ar até 18/11/2026. Decisão do Álvaro em 2026-11-12, entre as próximas ações (item 8.2 do `08-lancamento.md`).

**Quem usa.** O anunciante, que recebe o aviso; o Álvaro, que vê a tarefa rodar na Vercel.

| ID | Requisito |
|---|---|
| RF-120 | Uma vez por dia, o dono de cada anúncio no ar que sai do caderno nas próximas 36 horas recebe um e-mail com: título e código do anúncio, dia e hora em que sai ("hoje" ou "amanhã"), visitas até agora, botão para renovar em Minha conta e o link da página do anúncio. |
| RF-121 | A tarefa roda sozinha pelo agendador da Vercel, às 9h de Brasília, e responde com o resumo da rodada: anúncios encontrados, avisos enviados, ignorados e falhas. |
| RF-122 | Sem servidor de e-mail configurado, nada é enviado nem marcado, e o site segue como antes. |

| ID | Regra |
|---|---|
| RN-120 | Um aviso por prazo: o anúncio fica marcado com a data de fim que o aviso anunciou. Renovar muda a data, e o prazo novo ganha o seu aviso. Rodar duas vezes no mesmo dia não manda dois e-mails. |
| RN-121 | Falha no envio desfaz a marca: o anúncio volta na rodada seguinte, se ainda estiver no ar e na janela. |
| RN-122 | Não recebem aviso o dono com a conta desativada e o endereço em domínio reservado para teste (`.test`, `.example`, `.invalid`, `.localhost`, `example.com`, `example.net`, `example.org`), como a conta dos anúncios de exemplo. Esses ficam marcados sem envio, para não voltarem toda rodada. |
| RN-123 | A rota da tarefa só roda com o segredo do agendador (`Authorization: Bearer` + `CRON_SECRET`). Sem a variável, recusa sempre. |
| RN-124 | No máximo 200 avisos por rodada; o que sobrar fica para a rodada seguinte, mais perto do fim. |
| RN-125 | Do cadastro do dono, só o primeiro nome entra na carta; o e-mail é apenas o destino. A carta lembra que renovar é sempre pelo site, em Minha conta, e que o site não pede pagamento por mensagem, e-mail ou telefone. |

**Aceite.** Com o agendador ligado, o dono do Astra recebe em 17/11/2026, por volta das 9h, o e-mail "Seu anúncio "Astra Sedan Expression 2002" sai do caderno amanhã", com o botão que abre o anúncio em Minha conta. A rota sem o segredo responde 401.

## Plano (ADR-17)

- **Domínio** (`domain/anuncio/vencimento.ts`): janela de 36 horas, `podeReceberEmail` (RN-122) e `montarAvisoDeVencimento`, que monta a `Carta`. Dia e hora no fuso de Brasília, o que o dono vê na tela.
- **Aplicação**: porta `AvisosDeVencimentoRepository` (`aVencer`, `marcarAvisado`, `desmarcar`) e caso de uso `AvisarVencimentosUseCase`. A marca é feita **antes** do envio, numa atualização condicionada (RN-120): se outra rodada marcou primeiro, este anúncio é pulado. Se o envio falha, a marca é desfeita (RN-121). Os envios são um de cada vez, para não estourar o limite do provedor.
- **Endereços**: `EnderecosDoSite` ganha `anuncioEmMinhaConta` (botão de renovar) e `paginaDoAnuncio`.
- **Banco**: coluna `avisoDeVencimentoPara` em `anuncios`, com a data de fim já avisada, e índice `(situacao, expiraEm)` para a busca da janela. Migration `20261112000000_aviso_de_vencimento`, aplicada no deploy de produção (ADR-09).
- **Rota** `GET /api/tarefas/vencimentos`: confere o segredo com comparação de tempo constante (RN-123) e chama o caso de uso.
- **Agendador**: `crons` em `vercel.json`, `0 12 * * *` (12h UTC = 9h em Brasília). A Vercel manda o `CRON_SECRET` do projeto no cabeçalho sozinha.
- Por que 36 horas: com uma rodada por dia, todo anúncio entra numa rodada com pelo menos 12 horas de antecedência, e o horário impreciso do agendador (a Vercel pode disparar em qualquer minuto da hora marcada) não faz ninguém ficar sem aviso. A marca por data de fim impede o aviso repetido.

## Tarefas

- [x] T-150 Carta do aviso e regras do domínio, com testes (RF-120, RN-122, RN-125; `tests/unit/aviso-de-vencimento.test.ts`)
- [x] T-151 Porta, caso de uso e repositório falso, com testes (RF-122, RN-120, RN-121, RN-124)
- [x] T-152 Coluna, índice e migration; repositório no Prisma
- [x] T-153 Rota da tarefa com o segredo (RF-121, RN-123) e agendador em `vercel.json` (ADR-17)
- [x] T-154 Publicar e conferir em produção: a migration aplicada, a rota recusa sem o segredo (401) e o agendador aparece na Vercel. *2026-11-12: commit `b6da736`, deploy das 10:03. O log do build mostra a migration `20261112000000_aviso_de_vencimento` aplicada. A rota responde 401 sem o segredo e com segredo errado, e 405 para POST; capa, anúncio, seção, sitemap e robots respondem 200. Não conferido: o agendador na tela da Vercel (a CLI 50 não lista agendadores) e uma rodada de verdade, que precisa do segredo. O deploy com `crons` passou, o que indica configuração aceita pela Vercel.*
- [ ] T-155 Conferir o primeiro aviso de verdade: o do Astra, em 17/11/2026

## Depois

- Botão "Renovar" que já abre o Pix, sem passar pela tela do anúncio.
- Opção para o anunciante desligar os avisos (item 8.5 do `08-lancamento.md`).
- Aviso de "seu anúncio está no ar", com os links para divulgar (item 8.3).
