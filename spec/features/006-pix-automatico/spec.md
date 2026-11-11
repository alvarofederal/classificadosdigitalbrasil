# 006 · Pix automático

## Spec

**Problema.** Semana 1: 10 anúncios. Semana 2: 350. Semana 3: 5.890. Confirmar Pix à mão não escala. O pagamento precisa ser reconhecido sozinho e liberar o anúncio conforme o plano pago.

| ID | Requisito |
|---|---|
| RF-80 | Cada cobrança gera um Pix dinâmico no gateway, com o valor exato do plano e o código da cobrança como referência. |
| RF-81 | O gateway avisa o sistema (webhook) quando o Pix é pago; o sistema confere e publica o anúncio sem ninguém intervir. |
| RF-82 | A tela de pagamento do anunciante acompanha sozinha e mostra "Pagamento confirmado" assim que cai (consulta a cada 5 segundos, também serve de reserva se o webhook atrasar). |
| RF-83 | Sem credenciais do gateway, o sistema volta ao Pix estático com confirmação no painel (comportamento da versão 0.1). |
| RF-84 | O admin pode publicar como **cortesia** (plano e dias escolhidos, valor zero), para parceiros e para o anúncio-exemplo. |

| ID | Regra |
|---|---|
| RN-80 | Só confirma se: o gateway diz *aprovado*, a referência bate com uma cobrança pendente e o valor pago é igual ao valor da cobrança. Qualquer divergência fica pendente e registrada no log. |
| RN-81 | O webhook é idempotente: o mesmo aviso repetido não confirma duas vezes (a confirmação só vale para cobrança ainda pendente). |
| RN-82 | O webhook confere a assinatura do gateway quando a chave secreta está configurada. |
| RN-83 | O Pix do gateway vence em 24 horas; depois disso o anunciante gera outro. |
| RN-84 | A cobrança é uma ordem da API de Orders. Só a ordem `processed` confirma; `failed`, `canceled`, `refunded`, `charged_back` e `expired` contam como recusada; qualquer outra situação segue pendente. |
| RN-85 | O valor conferido na RN-80 é o `total_paid_amount` da ordem (na falta dele, o `total_amount`). |
| RN-86 | O webhook só processa aviso do tipo `order` com identificador de ordem (`ORD…`). Os demais recebem 200 e são ignorados. |
| RN-87 | Cobrança do gateway cancelada aqui (troca de plano ou período, Pix vencido, anúncio removido, cortesia) é cancelada também no Mercado Pago, para o Pix antigo deixar de ser pagável. Se o Mercado Pago não responder, o cancelamento daqui segue e o caso fica no log. |
| RN-88 | Se o Mercado Pago responde que o Pix já foi pago, a cobrança não é cancelada: a troca de plano e a cortesia são recusadas com "este Pix já foi pago" e a confirmação segue o caminho normal. A remoção do anúncio segue, com registro no log. |
| RN-89 | Pix aprovado numa cobrança que já estava cancelada aqui não publica nada e fica registrado como `PAGO_APOS_CANCELAMENTO`, para o admin devolver o valor ou publicar por cortesia. |

## Plano (ADR-12 e ADR-14)

**Gateway escolhido para começar: Mercado Pago (Pix 0,99% pela API).** Num anúncio de R$ 1,00 a taxa é R$ 0,01. Aceita conta com CPF, não exige certificado digital (o Efí exige mTLS), webhook com assinatura HMAC. Alternativa avaliada: Woovi/OpenPix (cerca de 0,80%, negociável por volume).

- Porta `GatewayPix` (criar cobrança, consultar pagamento). Adaptador `MercadoPagoGateway` (`POST /v1/orders` com `type: online`, `processing_mode: automatic`, Pix em `transactions.payments[].payment_method`, `external_reference` = código da cobrança, `X-Idempotency-Key`). Trocar de gateway = escrever outro adaptador.
- Webhook `POST /api/pagamentos/mercadopago`: valida `x-signature` (HMAC-SHA256 de `id:…;request-id:…;ts:…;`, com o `data.id` em minúsculas), consulta a ordem em `GET /v1/orders/{id}` e chama `ProcessarPagamentoDoGateway`.
- Na API de Orders não existe `notification_url` no corpo: o endereço do aviso fica só na aplicação, no painel do Mercado Pago.
- `pagamentos` ganha `gateway`, `gatewayId`, `copiaECola`, `expiraEm`.
- Cancelamento (T-86): a porta `GatewayPix` ganha `cancelar`. O adaptador chama `POST /v1/orders/{id}/cancel` com `X-Idempotency-Key: cancelar-<id>` (a chave de criação é o código da cobrança e não pode ser repetida). O Mercado Pago só cancela ordem em `action_required` ou `created`; nas outras responde 409, e a consulta da ordem diz se o Pix foi pago (RN-88) ou se já não pode ser pago.

**Passo a passo para ligar (feito pelo Álvaro; o código já está pronto):**

1. **Conta Mercado Pago** (CPF serve) com **uma chave Pix cadastrada** no app (Seu perfil → Pix → Minhas chaves). Sem chave, o Mercado Pago não gera Pix pela API.
2. **Criar a aplicação**: mercadopago.com.br/developers → Integrações → Criar aplicação → Criar no painel de integração → *Checkout Transparente* → tipo de API **API de Orders**. Feito em 2026-11-09: aplicação *Classificados Digitais do Brasil*.
3. **Ativar credenciais de produção**: na aplicação, aba Produção → Começar → setor *Outros*, site `https://classificadosdigitalbrasil.vercel.app`, aceitar os termos. Feito em 2026-11-09. Copiar o **Access Token** (começa com `APP_USR-`) em Credenciais.
4. **Webhook**: na aplicação, Configuração de webhooks → aba Produção → URL `https://classificadosdigitalbrasil.vercel.app/api/pagamentos/mercadopago` → evento **Order (Mercado Pago)** → salvar. Feito em 2026-11-09. Copiar a **assinatura secreta**.
5. **Vercel** → projeto → Settings → Environment Variables → Production: `MERCADO_PAGO_ACCESS_TOKEN` e `MERCADO_PAGO_WEBHOOK_SECRET`. Depois, **Redeploy**.
6. **Conferir** em Painel → Configurações: todos os itens marcados ("Conta conectada", "Credencial de produção", "Assinatura secreta", "Endereço do aviso").
7. **Testar de verdade**: com uma conta de anunciante **de e-mail diferente** do e-mail da conta Mercado Pago (o Mercado Pago recusa cobrança em que pagador e recebedor são a mesma pessoa), criar um anúncio Simples de 7 dias (R$ 1,00), pagar o Pix pelo app de outro banco e ver a tela confirmar sozinha.
8. **Conferir o cancelamento** (depois do deploy do T-86): gerar um Pix, trocar de plano antes de pagar e ver no Mercado Pago (Atividade ou a ordem na aplicação) que a ordem antiga aparece cancelada.

O botão "Simular notificação" do Mercado Pago manda uma ordem inexistente; o site responde "recebido" e não muda nada.

**Escala.** Cada Pix pago gera um aviso; o processamento é uma consulta à API e duas atualizações no banco, em transação. Milhares por dia cabem folgados na Vercel e no MySQL.

## Tarefas

- [x] T-80 Porta e adaptador Mercado Pago, com testes do mapeamento
- [x] T-81 Webhook com assinatura e caso de uso idempotente
- [x] T-82 Acompanhamento automático na tela de pagamento
- [x] T-83 Cortesia no painel
- [ ] T-84 Cadastrar as credenciais na Vercel e fazer um Pix real de R$ 1,00 (depende do Álvaro). Credenciais na Vercel: feito, conferido em 2026-11-10. Faltam conferir o painel (passo 6) e o Pix real (passo 7)
- [x] T-85 Adaptador e webhook na API de Orders (ADR-14; RN-84 a RN-86)
- [x] T-86 Cancelar a ordem no Mercado Pago quando a cobrança é cancelada aqui (RN-87 a RN-89; `tests/unit/pix-cancelamento.test.ts`). Antes o Pix antigo continuava pagável por até 24 horas e, se fosse pago, o dinheiro entrava e o anúncio não publicava. Feito em 2026-11-10, sem chamada real ao Mercado Pago: confere no passo 8

## Onde parou (2026-11-10)

**Passo 5 feito.** Em 2026-11-10 a lista de variáveis de produção da Vercel mostra `MERCADO_PAGO_ACCESS_TOKEN` e `MERCADO_PAGO_WEBHOOK_SECRET`, criadas há 1 dia (a Vercel não mostra a hora), antes do deploy de produção em vigor (commit `3b1b900`, de 2026-11-09 às 20:48). O site em produção já roda com elas. O endereço do aviso responde: um `POST` que não é de ordem devolve `{"ok":true,"ignorado":true}`.

**Falta, e só o Álvaro pode fazer:**

- **Passo 6**: abrir Painel → Configurações e conferir os itens. É ali que se vê se o token é de produção ou de teste; pela lista da Vercel não dá para saber.
- **Passo 7**: o Pix real de R$ 1,00, com uma conta de anunciante de e-mail diferente do da conta Mercado Pago.

O T-86 (cancelar a ordem no Mercado Pago) está em produção desde 2026-11-11. O passo 8 confere com o Mercado Pago de verdade.
