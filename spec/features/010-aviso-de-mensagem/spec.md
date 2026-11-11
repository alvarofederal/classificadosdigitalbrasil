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

| ID | Regra |
|---|---|
| RN-100 | O aviso nunca impede a mensagem: falha no envio (servidor fora, endereço recusado) vai para o log e a mensagem continua gravada. |
| RN-101 | No máximo 10 avisos por anúncio em 24 horas, contados pelas mensagens recebidas. O décimo diz que as próximas ficam só em Minha conta. Protege a caixa do anunciante e o remetente do site contra enxurrada. |
| RN-102 | O aviso vai só para o e-mail da conta do dono e não leva CPF nem celular dele. Nenhum dado do dono é mostrado a quem escreveu (Art. 5). |
| RN-103 | Nome e texto de quem escreveu entram no e-mail como texto, nunca como HTML. O endereço de resposta só é usado quando é um e-mail em formato simples (letras, números e `._%+-`); senão o aviso sai sem ele. |
| RN-104 | Dono com a conta desativada não recebe aviso. |
| RN-105 | Todo aviso traz o lembrete de segurança: o site não pede pagamento, código nem senha por mensagem. |

**Aceite.** Com o servidor de e-mail ligado, mandar uma mensagem pelo botão de um anúncio no ar faz chegar um e-mail ao dono em menos de um minuto, com o texto e o contato; a tela de quem escreveu confirma na hora. Com o servidor desligado ou fora do ar, a mensagem aparece em Minha conta do mesmo jeito.

**Fora desta entrega.** Aviso de "seu anúncio vence amanhã", de "anúncio no ar" e de chamado novo para o administrador (usam o mesmo correio; ver *Depois*). Preferência para o anunciante desligar o aviso.

## Plano (ADR-15)

- **Domínio** `domain/mensagem/aviso.ts`: monta a *carta* do aviso (assunto, parágrafos, citação, contato, botão, observações, endereço de resposta) sem HTML; guarda o limite de avisos por dia, o link de WhatsApp a partir do telefone e a regra do endereço de resposta. `domain/shared/carta.ts` define a carta, que serve a qualquer e-mail do site.
- **Portas**: `Correio` e `EnderecosDoSite` (`application/ports/correio.ts`) e `SegundoPlano` (`application/ports/sistema.ts`: rodar uma tarefa sem segurar a resposta). `MensagemRepository` ganha `contarDoAnuncioDesde`.
- **Casos de uso**: `EnviarMensagemUseCase` grava e agenda `AvisarMensagemNovaUseCase` (`application/use-cases/anuncios/mensagens.ts`); `EnviarEmailDeTesteUseCase` atende o painel (`application/use-cases/admin/administracao.ts`).
- **Infraestrutura** `infrastructure/email/`: `modelo.ts` transforma a carta em HTML (página branca, tinta preta, manchete e fios do jornal) e em texto puro, escapando tudo; `correio-smtp.ts` envia por SMTP com `nodemailer` 10.2.1 (versão fixada, ver ADR-15); `CorreioDesligado` quando faltam as variáveis. `infrastructure/segundo-plano.ts` usa o `after` do Next.
- **Apresentação**: seção "Aviso de mensagem por e-mail" em Painel → Configurações, com o botão de teste; frase em Minha conta; privacidade em `/termos`.
- **Banco**: não muda.

**Variáveis (Vercel → Settings → Environment Variables → Production):**

| Variável | Valor |
|---|---|
| `SMTP_HOST` | servidor de saída (Gmail: `smtp.gmail.com`) |
| `SMTP_PORT` | opcional: `465` (padrão, TLS direto) ou `587` (STARTTLS obrigatório) |
| `SMTP_USER` | usuário do servidor (no Gmail, o endereço completo) |
| `SMTP_PASS` | senha do servidor (no Gmail, uma *senha de app*, não a senha da conta) |
| `SMTP_FROM` | opcional: endereço que aparece como remetente, quando difere de `SMTP_USER` |

**Passo a passo para ligar (feito pelo Álvaro; o código já está pronto):**

1. Escolher a caixa que vai enviar os avisos. Sem domínio próprio, o caminho mais simples é uma conta Gmail do site (limite de 500 e-mails por dia).
2. No Gmail: ativar a verificação em duas etapas e criar uma **senha de app** em myaccount.google.com/apppasswords (nome: "Classificados"). Os espaços que o Google mostra na senha podem ir junto: o sistema tira.
3. Na Vercel, cadastrar `SMTP_HOST`, `SMTP_USER` e `SMTP_PASS` em Production e fazer **Redeploy** (ou esperar o próximo deploy).
4. Painel → Configurações → *Aviso de mensagem por e-mail*: conferir os itens marcados e clicar em **Enviar e-mail de teste**.
5. Mandar uma mensagem de verdade num anúncio no ar e ver o aviso chegar.

Com domínio próprio no futuro, basta trocar as variáveis por um provedor com o domínio autenticado (Brevo, Resend, Amazon SES); o código não muda. Nesses provedores o usuário do SMTP não é um endereço, então `SMTP_FROM` passa a ser obrigatório.

## Tarefas

- [x] T-120 Carta, aviso de mensagem nova e regras no domínio (RF-100, RF-101, RN-101 a RN-105)
- [x] T-121 Portas `Correio` e `SegundoPlano`; casos de uso de aviso e de teste (RF-102, RF-104, RN-100, RN-104)
- [x] T-122 Modelo do e-mail e adaptador SMTP (RN-103, ADR-15)
- [x] T-123 Painel → Configurações com situação e e-mail de teste (RF-103); frase em Minha conta (RF-105); privacidade em `/termos`
- [x] T-124 Testes de unidade citando os RF/RN (`tests/unit/aviso-de-mensagem.test.ts`) e envio real contra um servidor SMTP local
- [ ] T-125 Cadastrar as variáveis na Vercel e conferir em produção (depende do Álvaro)

## Verificação (2026-11-10)

- 29 testes de unidade da funcionalidade; `npm test` (137), `npm run typecheck` e `npx next build` passando.
- Envio real pelo `CorreioSmtp` contra um servidor SMTP local de teste: TLS direto (465) e STARTTLS (587) entregaram o aviso; a senha só trafegou depois do TLS; certificado não confiável foi recusado; senha errada e porta sem servidor voltaram como mensagem clara, sem exceção.
- O e-mail saiu em duas partes (texto e HTML), em UTF-8, com assunto, remetente, destino e endereço de resposta certos. O HTML foi conferido em 600 px e em 375 px.
- `/termos` conferido no navegador com o texto novo de privacidade.
- **Não conferido**: a seção nova do painel e a frase de Minha conta na tela (pedem login), o envio por um provedor de verdade e a chegada na caixa de entrada. Ficam para a T-125.
- Em produção desde 2026-11-11. O aviso segue desligado até as variáveis `SMTP_*` serem cadastradas na Vercel.

## Riscos conhecidos

- O limite da RN-101 é por anúncio. Um ataque espalhado por muitos anúncios ainda pode esgotar o limite diário da caixa de envio; o site continua funcionando e as falhas ficam no log.
- Depois de uma enxurrada, o anúncio fica até 24 horas sem aviso, mesmo para mensagem legítima. As mensagens seguem em Minha conta.

## Depois

Os próximos avisos usam a mesma carta e o mesmo correio: "seu anúncio vence amanhã" (precisa de agendador diário), "seu anúncio está no ar" com os links para divulgar, e chamado novo para o administrador.
