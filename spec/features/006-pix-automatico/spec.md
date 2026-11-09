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

## Plano (ADR-12)

**Gateway escolhido para começar: Mercado Pago (Pix 0,99% pela API).** Num anúncio de R$ 1,00 a taxa é R$ 0,01. Aceita conta com CPF, não exige certificado digital (o Efí exige mTLS), webhook com assinatura HMAC. Alternativa avaliada: Woovi/OpenPix (cerca de 0,80%, negociável por volume).

- Porta `GatewayPix` (criar cobrança, consultar pagamento). Adaptador `MercadoPagoGateway` (`POST /v1/payments` com `payment_method_id: pix`, `external_reference` = código da cobrança, `X-Idempotency-Key`). Trocar de gateway = escrever outro adaptador.
- Webhook `POST /api/pagamentos/mercadopago`: valida `x-signature` (HMAC-SHA256 de `id:…;request-id:…;ts:…;`), consulta o pagamento na API e chama `ProcessarPagamentoDoGateway`.
- `pagamentos` ganha `gateway`, `gatewayId`, `copiaECola`, `expiraEm`.

**Para ligar (Vercel → Environment Variables, Production):**

| Variável | Onde pegar |
|---|---|
| `MERCADO_PAGO_ACCESS_TOKEN` | Mercado Pago → Suas integrações → aplicação → Credenciais de produção → Access Token |
| `MERCADO_PAGO_WEBHOOK_SECRET` | Mesma aplicação → Webhooks → configurar a URL `https://classificadosdigitalbrasil.vercel.app/api/pagamentos/mercadopago`, evento *Pagamentos* → Assinatura secreta |

**Escala.** Cada Pix pago gera um aviso; o processamento é uma consulta à API e duas atualizações no banco, em transação. Milhares por dia cabem folgados na Vercel e no MySQL.

## Tarefas

- [x] T-80 Porta e adaptador Mercado Pago, com testes do mapeamento
- [x] T-81 Webhook com assinatura e caso de uso idempotente
- [x] T-82 Acompanhamento automático na tela de pagamento
- [x] T-83 Cortesia no painel
- [ ] T-84 Cadastrar as credenciais na Vercel e fazer um Pix real de R$ 1,00 (depende do Álvaro)
