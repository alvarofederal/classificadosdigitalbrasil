# 010 · Aviso de mensagem por e-mail

## Spec

**Problema.** Quem recebe mensagem num anúncio só descobre se entrar em Minha conta. O visitante escreve, ninguém responde, e os dois desistem do site. Decisão do Álvaro em 2026-11-10: resolver isto antes de divulgar.

**Quem usa.** O anunciante (recebe o aviso) e o administrador (liga o envio e confere que funciona).

| ID | Requisito |
|---|---|
| RF-100 | Quando alguém manda mensagem a um anúncio no ar, o dono recebe um e-mail no endereço da conta com: título e código do anúncio, nome de quem escreveu, o texto, o contato para responder e o link para a mensagem em Minha conta. |
| RF-101 | Se o contato informado é um e-mail, responder ao aviso manda a resposta direto para quem escreveu. Se é um telefone, o aviso traz o link de conversa no WhatsApp para aquele número. |
| RF-102 | Quem escreve não espera o envio do e-mail: a tela confirma "Mensagem enviada" assim que a mensagem é gravada, e o aviso sai em seguida. |
| RF-103 | Painel → Configurações mostra a situação do aviso por e-mail (servidor cadastrado, conexão e login conferidos, remetente) e tem o botão "Enviar e-mail de teste", que manda um e-mail ao administrador logado e mostra o resultado. |
| RF-104 | Sem servidor de e-mail configurado, o site funciona como antes: a mensagem é gravada e aparece em Minha conta, sem aviso. |
| RF-105 | Em Minha conta, a lista de mensagens do anúncio diz em que endereço o dono é avisado. |
| RF-106 | Com a chave do Resend cadastrada (`RESEND_API_KEY`), o envio sai pelo Resend sem mais nenhuma variável obrigatória. É o mesmo provedor dos outros sistemas do Álvaro (pedido dele em 2026-11-11). |

| ID | Regra |
|---|---|
| RN-100 | O aviso nunca impede a mensagem: falha no envio (servidor fora, endereço recusado) vai para o log e a mensagem continua gravada. |
| RN-101 | No máximo 10 avisos por anúncio em 24 horas, contados pelas mensagens recebidas. O décimo diz que as próximas ficam só em Minha conta. Protege a caixa do anunciante e o remetente do site contra enxurrada. |
| RN-102 | O aviso vai só para o e-mail da conta do dono e não leva CPF nem celular dele. Nenhum dado do dono é mostrado a quem escreveu (Art. 5). |
| RN-103 | Nome e texto de quem escreveu entram no e-mail como texto, nunca como HTML. O endereço de resposta só é usado quando é um e-mail em formato simples (letras, números e `._%+-`); senão o aviso sai sem ele. |
| RN-104 | Dono com a conta desativada não recebe aviso. |
| RN-105 | Todo aviso traz o lembrete de segurança: o site não pede pagamento, código nem senha por mensagem. |
| RN-106 | Ordem de escolha do servidor de envio: se alguma variável `SMTP_HOST`, `SMTP_USER` ou `SMTP_PASS` existe, vale o SMTP informado; senão, se `RESEND_API_KEY` existe, vale o Resend; senão, o aviso fica desligado (RF-104). |
| RN-107 | No Resend o remetente é `noreply@karollynemorais.com.br`, o domínio já autenticado na conta e usado nos outros sistemas. `EMAIL_FROM` troca o endereço e aceita tanto `endereco@dominio` quanto `Nome <endereco@dominio>`; o nome exibido é sempre o do site. `EMAIL_FROM` em formato inválido desliga o aviso e aparece no painel como o que falta. |

**Aceite.** Com o servidor de e-mail ligado, mandar uma mensagem pelo botão de um anúncio no ar faz chegar um e-mail ao dono em menos de um minuto, com o texto e o contato; a tela de quem escreveu confirma na hora. Com o servidor desligado ou fora do ar, a mensagem aparece em Minha conta do mesmo jeito.

**Fora desta entrega.** Aviso de "seu anúncio vence amanhã", de "anúncio no ar" e de chamado novo para o administrador (usam o mesmo correio; ver *Depois*). Preferência para o anunciante desligar o aviso.

## Plano (ADR-15)

- **Domínio** `domain/mensagem/aviso.ts`: monta a *carta* do aviso (assunto, parágrafos, citação, contato, botão, observações, endereço de resposta) sem HTML; guarda o limite de avisos por dia, o link de WhatsApp a partir do telefone e a regra do endereço de resposta. `domain/shared/carta.ts` define a carta, que serve a qualquer e-mail do site.
- **Portas**: `Correio` e `EnderecosDoSite` (`application/ports/correio.ts`) e `SegundoPlano` (`application/ports/sistema.ts`: rodar uma tarefa sem segurar a resposta). `MensagemRepository` ganha `contarDoAnuncioDesde`.
- **Casos de uso**: `EnviarMensagemUseCase` grava e agenda `AvisarMensagemNovaUseCase` (`application/use-cases/anuncios/mensagens.ts`); `EnviarEmailDeTesteUseCase` atende o painel (`application/use-cases/admin/administracao.ts`).
- **Infraestrutura** `infrastructure/email/`: `modelo.ts` transforma a carta em HTML (página branca, tinta preta, manchete e fios do jornal) e em texto puro, escapando tudo; `correio-smtp.ts` envia por SMTP com `nodemailer` 10.2.1 (versão fixada, ver ADR-15); `CorreioDesligado` quando faltam as variáveis. `infrastructure/segundo-plano.ts` usa o `after` do Next.
- **Apresentação**: seção "Aviso de mensagem por e-mail" em Painel → Configurações, com o botão de teste; frase em Minha conta; privacidade em `/termos`.
- **Banco**: não muda.
- **Resend (ADR-16, 2026-11-11)**: `lerConfiguracaoDoCorreio` (`infrastructure/email/correio-smtp.ts`) aplica a RN-106. Com `RESEND_API_KEY`, monta a configuração do próprio `CorreioSmtp` para o servidor SMTP do Resend (`smtp.resend.com`, porta 465, usuário `resend`, senha = a chave). Nenhum adaptador novo e nenhuma dependência nova: carta, modelo, limites e testes do envio são os mesmos.

**Variáveis (Vercel → Settings → Environment Variables → Production):**

Caminho em uso, o Resend:

| Variável | Valor |
|---|---|
| `RESEND_API_KEY` | a chave da API do Resend (a mesma conta dos outros sistemas) |
| `EMAIL_FROM` | opcional: outro remetente, de um domínio autenticado no Resend. Sem ela, `noreply@karollynemorais.com.br` |

Caminho alternativo, um servidor SMTP qualquer (tem preferência se estiver cadastrado):

| Variável | Valor |
|---|---|
| `SMTP_HOST` | servidor de saída (Gmail: `smtp.gmail.com`) |
| `SMTP_PORT` | opcional: `465` (padrão, TLS direto) ou `587` (STARTTLS obrigatório) |
| `SMTP_USER` | usuário do servidor (no Gmail, o endereço completo) |
| `SMTP_PASS` | senha do servidor (no Gmail, uma *senha de app*, não a senha da conta) |
| `SMTP_FROM` | opcional: endereço que aparece como remetente, quando difere de `SMTP_USER` |

**Passo a passo para ligar (feito pelo Álvaro; o código já está pronto):**

1. Na Vercel, cadastrar `RESEND_API_KEY` em Production. O arquivo `.env` ou `,env` da máquina não chega ao site: em produção só vale o que está na Vercel.
2. Fazer **Redeploy** (ou esperar o próximo deploy).
3. Painel → Configurações → *Aviso de mensagem por e-mail*: conferir os itens marcados e clicar em **Enviar e-mail de teste**.
4. Mandar uma mensagem de verdade num anúncio no ar e ver o aviso chegar.

Se o teste voltar com recusa do remetente, o domínio de `EMAIL_FROM` (ou o padrão) não está autenticado na conta do Resend dona da chave: conferir em resend.com → Domains.

## Tarefas

- [x] T-120 Carta, aviso de mensagem nova e regras no domínio (RF-100, RF-101, RN-101 a RN-105)
- [x] T-121 Portas `Correio` e `SegundoPlano`; casos de uso de aviso e de teste (RF-102, RF-104, RN-100, RN-104)
- [x] T-122 Modelo do e-mail e adaptador SMTP (RN-103, ADR-15)
- [x] T-123 Painel → Configurações com situação e e-mail de teste (RF-103); frase em Minha conta (RF-105); privacidade em `/termos`
- [x] T-124 Testes de unidade citando os RF/RN (`tests/unit/aviso-de-mensagem.test.ts`) e envio real contra um servidor SMTP local
- [ ] T-125 Cadastrar `RESEND_API_KEY` na Vercel e conferir em produção (depende do Álvaro)
- [x] T-126 Envio pelo Resend só com `RESEND_API_KEY` (RF-106, RN-106, RN-107, ADR-16): leitura das variáveis, painel e testes. Feito em 2026-11-11

## Verificação (2026-11-10)

- 29 testes de unidade da funcionalidade; `npm test` (137), `npm run typecheck` e `npx next build` passando.
- Envio real pelo `CorreioSmtp` contra um servidor SMTP local de teste: TLS direto (465) e STARTTLS (587) entregaram o aviso; a senha só trafegou depois do TLS; certificado não confiável foi recusado; senha errada e porta sem servidor voltaram como mensagem clara, sem exceção.
- O e-mail saiu em duas partes (texto e HTML), em UTF-8, com assunto, remetente, destino e endereço de resposta certos. O HTML foi conferido em 600 px e em 375 px.
- `/termos` conferido no navegador com o texto novo de privacidade.
- **Não conferido**: a seção nova do painel e a frase de Minha conta na tela (pedem login), o envio por um provedor de verdade e a chegada na caixa de entrada. Ficam para a T-125.
- Em produção desde 2026-11-11. O aviso dependia de `RESEND_API_KEY` na Vercel, cadastrada no mesmo dia (ver a seção seguinte).

## Verificação do Resend (2026-11-11, T-126)

- 5 testes novos em `tests/unit/aviso-de-mensagem.test.ts` (34 na funcionalidade); `npm test` (161), `npm run typecheck` e `npx next build` passando.
- Com a chave real, lida do arquivo do Álvaro sem ser mostrada: login em `smtp.resend.com:465` aceito; chave inventada recusada (535). Nenhum e-mail enviado.
- Lista de variáveis de produção da Vercel: `RESEND_API_KEY` não estava lá na primeira conferência; aparece desde cerca de 09:34 do mesmo dia.
- Publicado: commit `124ec5f` em produção desde 2026-11-11, 09:58, já com a variável cadastrada. Páginas públicas conferidas depois do deploy (lista em `05-tasks.md`, Continuidade).
- E-mail de teste (2026-11-11, depois da publicação): o Álvaro enviou pelo painel e a carta chegou, com o remetente `Classificados Digitais do Brasil <noreply@karollynemorais.com.br>`, a manchete e o texto previstos. A conta dona da chave aceita o remetente.
- Aviso de mensagem de verdade (2026-11-11): o Álvaro mandou uma mensagem por um anúncio no ar e o aviso chegou por e-mail.
- **Não conferido**: a resposta ao aviso (item 1.7 do `08-lancamento.md`). Fica para a T-125.

## Riscos conhecidos

- O limite da RN-101 é por anúncio. Um ataque espalhado por muitos anúncios ainda pode esgotar o limite diário da caixa de envio; o site continua funcionando e as falhas ficam no log.
- Depois de uma enxurrada, o anúncio fica até 24 horas sem aviso, mesmo para mensagem legítima. As mensagens seguem em Minha conta.

## Depois

Os próximos avisos usam a mesma carta e o mesmo correio: "seu anúncio vence amanhã" (precisa de agendador diário), "seu anúncio está no ar" com os links para divulgar, e chamado novo para o administrador.
