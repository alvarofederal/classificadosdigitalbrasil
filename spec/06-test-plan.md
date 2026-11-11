# 06 · Plano de testes

`npm test` roda os testes de unidade (Vitest), sem banco e sem rede. Os casos de uso rodam contra `tests/fakes.ts` (repositórios e gateway em memória) e o catálogo real do IBGE.

## Cobertos (156 testes, todos passando em 2026-11-10)

| Arquivo | O que verifica |
|---|---|
| `tests/unit/arquitetura.test.ts` | Art. 1: domínio e aplicação não importam framework nem infraestrutura (um teste por arquivo). |
| `tests/unit/dominio.test.ts` | CPF; cadastro; anúncio (normalização, validação, situação, RN-12, código); Pix BR Code (CRC16 `29B1`, montagem, chaves); mensagem; categoria; UF; planos (mês = 3 semanas, Vitrine o mais caro, prioridade, períodos, edição); distância e cidade mais próxima (Brasília, São Paulo, fora do Brasil); chamado (normalização e validação). |
| `tests/unit/casos-de-uso.test.ts` | Anúncio nasce com cobrança; cidade de outra UF e seção desativada recusadas; confirmar publica e renovar soma dias; confirmação dupla recusada; uma cobrança pendente por vez; renovação alheia recusada; Pix estático só com recebedor; edição só do dono; remover cancela pendências; só admin restaura; mensagem só no ar e com limite; cadastro e duplicidades; categoria em uso. |
| `tests/unit/pix-automatico.test.ts` | Vitrine 30 dias = R$ 30,00 com Pix do gateway; período e plano inválidos; gateway fora do ar cai no Pix estático; troca de plano cancela a cobrança anterior; webhook aprovado publica no plano pago com prioridade 3; aviso repetido não confirma duas vezes; valor divergente fica pendente; tela do dono vê quando cai; cortesia com valor zero; fotos por plano (Simples 1, admin 6); tabela editável; chamado com protocolo e limite por hora; localização fora do Brasil; adaptador do Mercado Pago na API de Orders (situação da ordem, centavos, prazo, corpo, idempotência, valor pago, filtro do aviso, assinatura HMAC com id em minúsculas). |
| `tests/unit/aviso-de-mensagem.test.ts` | Feature 010: carta do aviso (conteúdo, WhatsApp, endereço de resposta só em formato simples, lembrete de segurança, décimo aviso); aviso só para o e-mail do dono, sem CPF nem celular; mensagem confirmada antes do envio; servidor fora e erro inesperado não derrubam a mensagem; correio desligado; limite de 10 por anúncio em 24 horas; conta desativada; e-mail de teste; modelo do e-mail (escape de HTML, links só https, http ou mailto, texto puro, assunto em uma linha); adaptador SMTP (remetente, destino, resposta, falha como valor sem expor a senha, endereço recusado, leitura das variáveis); Resend só com a chave (RF-106, RN-106, RN-107: remetente padrão, `EMAIL_FROM` nos dois formatos e inválido, preferência do SMTP, chave recusada sem expor a chave); tarefa depois da resposta. |
| `tests/unit/pix-cancelamento.test.ts` | T-86: troca de plano, Pix vencido, remoção e cortesia cancelam a ordem no gateway; a mesma cobrança não cancela nada; Pix estático; gateway fora no cancelamento; Pix já pago recusa a troca e a cortesia, e a confirmação publica; Pix pago depois do cancelamento volta como falha própria; adaptador (`POST /v1/orders/{id}/cancel`, idempotência, 409 com consulta, 404, 500, rede fora, identificador inválido). |
| `tests/unit/formularios.test.ts` | Leitura de formulários com Zod (`src/lib/formularios.ts`): mensagens por campo e só a primeira de cada um; campo ausente, comprido demais ou que não é texto; blocos `texto`, `id`, `checkbox`, `inteiro`, `codigoIbge`, `reaisOpcional`, `reais` e `umDe`; formato do anúncio com plano, sem opcionais e com erros; fotos (até 6, endereço válido, campo a mais descartado, lista gigante recusada pelo tamanho). Escrito com o Zod 3 e mantido igual no Zod 4 (T-130). |

## Conferido fora dos testes (2026-11-10)

Envio real do aviso pelo `CorreioSmtp` contra um servidor SMTP local de teste: TLS direto (465) e STARTTLS (587) entregaram; a senha só trafegou depois do TLS; certificado não confiável foi recusado; senha errada e porta sem servidor viraram mensagem clara. O e-mail saiu em texto e HTML, em UTF-8, com assunto, remetente, destino e endereço de resposta certos; o HTML foi conferido em 600 e em 375 px. `/termos` conferido no navegador. Em produção: site e endereço do aviso do Mercado Pago respondendo; variáveis do Mercado Pago presentes na Vercel.

Depois da atualização do `next` e do `zod` (T-130), no servidor local: `/termos`, `/entrar`, `/cadastro`, `/robots.txt`, `/sitemap.xml`, a imagem de prévia de `/como-funciona` e a página 404 respondem; `/minha-conta` e `/painel` redirecionam para o login; o formulário de login enviado vazio volta com "Informe o e-mail." e "Informe a senha." pela Server Action. As páginas que consultam o banco não puderam ser conferidas nesta máquina (o banco recusa as credenciais do `.env` local).

## Conferido fora dos testes (2026-11-11, Resend)

Com a chave real do Resend, lida do arquivo do Álvaro sem ser mostrada: o login em `smtp.resend.com:465` (usuário `resend`) foi aceito, e uma chave inventada foi recusada com 535. Nenhum e-mail foi enviado. 161 testes, typecheck e `npx next build` passando. **Não conferido**: o envio de verdade e a aceitação do remetente `noreply@karollynemorais.com.br` pela conta dona da chave; isso aparece no "Enviar e-mail de teste" do painel, depois de a chave estar na Vercel (T-125).

## Conferido em produção (2026-11-11)

Depois do deploy com o `next` 16.4.5, o `zod` 4.6.7, a feature 010 e o T-86, comparando com as respostas colhidas minutos antes: capa, `/como-funciona`, `/termos` (texto novo de privacidade), `/entrar`, `/cadastro`, `/df/brasilia` (os mesmos 20 anúncios), `/df/brasilia/veiculos`, `/anuncio/9TTTMQ`, `/cartaz/9TTTMQ`, as duas imagens de prévia, `/sitemap.xml` (mesmo tamanho), `/robots.txt` e a página 404 respondem; `/a/9TTTMQ` redireciona (308) e `/minha-conta` e `/painel` mandam para o login (307); o webhook do Mercado Pago ignora aviso que não é de ordem; `/googledbc5da7adb4bf446.html` entrega o conteúdo exato. No navegador, capa e cidade não mostram erro de script, e a caixa de mensagem abre. Não conferido: áreas com login, envio de formulários, Pix real e e-mail.

## Conferido em produção (2026-11-09)

Migração aplicada e 4 planos criados no deploy; 19 anúncios no ar em Brasília/DF (Gol no plano Vitrine + 18 exemplos); capa com vitrine, valores e contato; Gol em primeiro na seção Veículos; página do anúncio com conversa, divulgação, cartaz e denúncia; `/a/9TTTMQ` redireciona (308); cartaz com QR; webhook responde e ignora aviso que não é de pagamento; anúncio inexistente mostra "Saiu do caderno".

## Roteiro manual pendente

1. Criar conta de anunciante (outro e-mail) → Novo anúncio → escolher plano e período → Pix.
2. Com o Mercado Pago ligado: pagar R$ 1,00 e ver a tela confirmar sozinha.
3. Painel → Chamados: enviar um contato pela capa e resolver.
4. "Anúncios perto de mim" no celular (permitir a localização).
5. Prévia do link do anúncio colado no WhatsApp.
6. Com a `RESEND_API_KEY` na Vercel: Painel → Configurações → Enviar e-mail de teste; depois mandar uma mensagem num anúncio no ar e ver o aviso chegar ao dono (feature 010, T-125). **Feito em 2026-11-11**: e-mail de teste, aviso de mensagem de verdade e resposta ao aviso com contato por e-mail. Falta só o contato por telefone (link do WhatsApp).
7. Com o Mercado Pago ligado: gerar um Pix, trocar de plano antes de pagar e conferir no Mercado Pago que a ordem antiga aparece cancelada (T-86).
8. Depois do deploy com o `next` 16.4.5 (T-130): abrir a capa, uma cidade, uma seção, um anúncio, o cartaz e Minha conta, e criar ou editar um anúncio com foto.

## Teste de carga (feature 008)

`tests/carga/caderno.js` com k6: leitura (0→50 usuários, 3 min) e pico (200 usuários, 30 s) na página de um anúncio. Metas: p95 < 800 ms, erro < 1%. Rodar só contra ambiente de teste: `k6 run -e BASE=https://… tests/carga/caderno.js`.
