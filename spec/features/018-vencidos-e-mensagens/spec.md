# 018 · Vencidos guardados por 180 dias e mensagens por 90

*Regra decidida pelo Álvaro em 2026-11-15 (`015-convites-de-cortesia/spec.md`, item 7: "como na OLX"). Feita em 2026-11-17, numa sessão curta só para ela. As três escolhas abaixo foram respondidas por ele no mesmo dia, antes do plano.*

## Spec

**Problema.** Hoje o anúncio vencido fica para sempre em Minha conta, misturado com os que estão no ar, e as mensagens dele também ficam para sempre. Não há um prazo dito ao dono, e o banco guarda texto, fotos e contatos de quem escreveu sem fim.

**Regra (item 7 da 015).** O anúncio vencido fica em *Expirados* por até 180 dias e pode ser renovado sem reescrever; depois é apagado de vez. As mensagens ficam para leitura por 90 dias depois do vencimento e depois são apagadas; renovando antes disso, o anúncio volta a receber mensagens.

### Escolhas do Álvaro (2026-11-17)

1. **Fotos no Cloudinary:** apagadas junto com o anúncio, como já acontece quando o dono tira uma foto do álbum.
2. **Aviso antes de apagar:** um e-mail 7 dias antes de o anúncio vencido ser apagado, com o botão de renovar.
3. **Alcance:** além dos vencidos, o anúncio que nunca foi ao ar (criado e nunca pago) é apagado 180 dias depois de criado. Os removidos ficam como estão, para o administrador poder restaurar.

### Requisitos

| ID | Requisito |
|---|---|
| RF-180 | Minha conta mostra os anúncios vencidos à parte, em *Expirados*, do vencido mais recente para o mais antigo, cada um com o dia em que venceu, até quando fica guardado e até quando as mensagens podem ser lidas. |
| RF-181 | Na tela do anúncio vencido, um aviso diz até quando ele fica guardado e que renovar o põe de volta no caderno como está; a seção de mensagens diz até quando elas ficam (ou quando foram apagadas). No anúncio que nunca foi ao ar, uma linha diz em que dia ele é apagado se não for publicado. |
| RF-182 | Uma vez por dia, pelo agendador da Vercel, o site apaga as mensagens dos anúncios vencidos há mais de 90 dias, os anúncios vencidos há mais de 180 dias e os que nunca foram ao ar criados há mais de 180 dias, e responde com o resumo da rodada. |
| RF-183 | Sete dias antes de apagar um anúncio vencido, o dono recebe um e-mail com o anúncio, o dia em que ele será apagado e o botão para renovar. |
| RF-184 | O Painel mostra a situação *Apagado*, filtra por ela e, no anúncio apagado, mostra o que ficou: código, cidade, seção, plano, datas, dono e pagamentos. A lista do Painel sem filtro não mostra os apagados. |
| RF-185 | O e-mail do vencimento (feature 012), os termos de uso e as perguntas frequentes dizem que o vencido fica guardado por 180 dias e as mensagens por 90. |

### Regras

| ID | Regra |
|---|---|
| RN-182 | O anúncio vencido (publicado ou desativado com o prazo passado) fica guardado por 180 dias contados do fim do prazo; nesse tempo pode ser editado e renovado com o mesmo texto e as mesmas fotos. Renovar muda o fim do prazo, e a contagem recomeça do novo vencimento. |
| RN-183 | As mensagens do anúncio vencido ficam para leitura por 90 dias contados do fim do prazo; depois são apagadas. Renovando, o anúncio volta a receber mensagens (RN-17), e as que ainda existiam continuam. |
| RN-184 | O anúncio que nunca foi ao ar (aguardando pagamento) é apagado 180 dias depois de criado, sem e-mail. |
| RN-185 | Apagar tira o anúncio de Minha conta e apaga o título, o texto, o preço, as fotos (também no Cloudinary), as mensagens e as visitas por pessoa. Ficam o código, a cidade, a seção, o plano, as datas, o total de visitas, a resposta do "Fechou negócio?" e os pagamentos: o código nunca é reaproveitado, e pagamento é registro de dinheiro. |
| RN-186 | Antes de apagar, a cobrança Pix em aberto do anúncio é cancelada, também no Mercado Pago (RN-87). Se o Pix já foi pago, o anúncio não é apagado nessa rodada, e a confirmação segue o caminho normal. |
| RN-187 | Um e-mail antes de apagar por vencimento: o anúncio guarda o fim de prazo já avisado, e rodar duas vezes não manda dois. Não recebem: conta desativada e e-mail de teste (RN-122). Sem servidor de e-mail nada é enviado nem marcado; a falha no envio desfaz a marca, e o anúncio volta na rodada seguinte. |
| RN-188 | Anúncio removido não entra na limpeza: o administrador pode restaurá-lo. |
| RN-189 | O anúncio apagado não volta: não se edita, não se renova, não recebe fotos, mensagens nem pagamento, e o link dele mostra "Saiu do caderno". Por rodada, no máximo 100 anúncios apagados e 200 e-mails; o resto fica para o dia seguinte. |

### Critérios de aceite

- Com um anúncio vencido há 10 dias, Minha conta o mostra em *Expirados*, com "guardado até" e "mensagens até" nas datas certas; renovar o põe de volta no caderno com o mesmo texto e as mesmas fotos.
- A rodada apaga as mensagens de um anúncio vencido há 91 dias e não mexe nas de um vencido há 89.
- A rodada apaga um anúncio vencido há 181 dias e um nunca pago criado há 181 dias, com fotos, mensagens e visitas por pessoa; os pagamentos ficam; o código não volta a ser usado; o anúncio some de Minha conta.
- O e-mail chega uma vez para o anúncio vencido há 174 dias; uma segunda rodada no mesmo dia não manda outro.
- O Painel filtra *Apagado* e abre a tela do anúncio apagado com os pagamentos.

## Plano

- **Domínio** `src/domain/anuncio/guarda.ts`: os prazos (180, 90, 7), `quandoApaga` e `quandoApagaAsMensagens` (datas mostradas ao dono, RN-182 a RN-184), os limites de corte de uma rodada e a carta do aviso de apagar (RF-183). Em `anuncio.ts`, a situação nova `APAGADO` ("Apagado"), que a tela mostra como tal (RN-189).
- **Aplicação** `src/application/use-cases/anuncios/guarda.ts`: `ApagarVencidosUseCase` (mensagens e anúncios, RF-182, RN-185, RN-186, RN-188, RN-189) e `AvisarAntesDeApagarUseCase` (RF-183, RN-187), com a porta `GuardaDosVencidosRepository` em `ports/caderno.ts`. Os casos de uso que editam, renovam, confirmam, dão cortesia, usam o banco ou mexem em fotos recusam o anúncio apagado.
- **Banco** (migration `20261117000000_vencidos_e_mensagens`): o valor `APAGADO` no enum de `anuncios.situacao` e as colunas `anuncios.apagadoEm` e `anuncios.avisoDeApagarPara`. Só acrescenta; nenhuma linha muda.
- **Agendador** (ADR-24): rota `GET /api/tarefas/vencidos`, com o mesmo `CRON_SECRET` da feature 012, uma vez por dia às 10h de Brasília (`0 13 * * *` em `vercel.json`).
- **Telas**: Minha conta separa *Expirados* (RF-180); a tela do anúncio mostra os prazos (RF-181); Painel com o filtro e a tela do apagado (RF-184); extrato do banco mostra "Anúncio apagado" sem link; termos, perguntas frequentes e e-mail do vencimento (RF-185).

## Tarefas

- [x] T-280 Perguntas ao Álvaro (fotos, aviso, alcance) e esta spec *(2026-11-17)*
- [x] T-281 Domínio: prazos, datas, situação Apagado e carta do aviso (RN-182 a RN-185, RN-189, RF-183) *(`src/domain/anuncio/guarda.ts`; `APAGADO` em `anuncio.ts`; recusas em `banco-de-dias.ts` e `resultado.ts`)*
- [x] T-282 Casos de uso: apagar vencidos, avisar antes de apagar, recusas do apagado (RF-182, RF-183, RN-185 a RN-189) *(`src/application/use-cases/anuncios/guarda.ts`; editar, fotos, renovar, confirmar, cortesia e remover recusam ou ignoram o apagado)*
- [x] T-283 Migration, repositório Prisma, rota da tarefa e agendador (ADR-24) *(migration `20261117000000_vencidos_e_mensagens`; `PrismaGuardaDosVencidosRepository`; `GET /api/tarefas/vencidos`; `0 13 * * *` em `vercel.json`)*
- [x] T-284 Telas: Minha conta, tela do anúncio, Painel, extrato, termos, perguntas e e-mail do vencimento (RF-180, RF-181, RF-184, RF-185)
- [x] T-285 Testes, typecheck, build e telas num banco local *(2026-11-17: 356 testes (30 novos em `tests/unit/vencidos.test.ts`, mais o de `implantacao.test.ts` com o agendador novo), typecheck e `npx next build`. No `next dev` com o MariaDB local (`cdb_local_016`), com seis anúncios de teste numa conta local: Minha conta mostrou Expirados com "guardado até" e "mensagens até" certos, no computador e no celular (375 px, sem rolagem lateral); a tela do anúncio vencido mostrou os dois avisos. A rota recusou sem o segredo e com o segredo errado (401); com o segredo de teste, a rodada apagou 3 mensagens (vencidos há 95 e 185 dias, e não as do vencido há 10), apagou o vencido há 185 dias (título, texto, preço, 2 fotos, mensagem e visitas; o pagamento confirmado ficou e o pendente foi cancelado) e o nunca pago criado há 181 dias, deixou o nunca pago de 20 dias, e mandou um e-mail (vencido há 175 dias), conferido no terminal. A segunda rodada não fez nada. Painel: filtro Apagado e a tela do apagado com os pagamentos; sem filtro, os apagados não aparecem; `/anuncio/T18DDD` responde "Saiu do caderno". Sem erro no servidor. Depois, o banco local voltou ao estado de antes dos dados de teste, com a migration nova aplicada. Não conferido aqui: o envio real do e-mail e a remoção no Cloudinary, que nesta pasta ficam desligados)*
- [x] T-286 Publicar com o OK do Álvaro e conferir no ar *(2026-11-17, por volta das 11:35: "Pode publicar". Commit `07ad6ad`, push junto com `e953f4d` (só spec, da 023). O deploy aplicou a migration `20261117000000_vencidos_e_mensagens` e foi aceito com os dois agendadores. Conferido no ar, de fora: capa, `/anuncio/4DPUMX` (o Astra), Brasília, sitemap, `/termos` e `/como-funciona` com o texto novo respondem 200; Minha conta e Painel mandam para o login (307); `/api/tarefas/vencidos` e `/api/tarefas/vencimentos` recusam sem o segredo (401); funções em `gru1`. A primeira rodada dos vencidos roda em 18/11 às 10h e não deve apagar nada: nenhum anúncio no ar passa dos 90 dias)*
