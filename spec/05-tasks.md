# 05 · Tarefas

## Versão 0.1 (2026-11-08)

| # | Tarefa | Requisitos | Situação |
|---|---|---|---|
| T-01 | Limpar a herança do projetobase (Courtesyfy) e montar o molde `spec/` | — | Feito |
| T-02 | Domínio: UF, CPF, usuário, categoria, anúncio, pagamento, Pix BR Code, mensagem | RN-01…RN-31 | Feito |
| T-03 | Casos de uso: acesso, conta, anúncios, fotos, mensagens, pagamentos, admin | RF-01…RF-35 | Feito |
| T-04 | Prisma: schema, migração inicial, repositórios e consultas | 03-data-model | Feito |
| T-05 | Municípios do IBGE em JSON | RN-04, ADR-06 | Feito |
| T-06 | Site: capa, cidade, seção em colunas, página do anúncio, modal de mensagem, álbum | RF-04…RF-07, RF-17, RF-18 | Feito |
| T-07 | Acesso: cadastro, entrar, sair, trocar senha, `proxy.ts` | RF-01, RF-02, RF-21 | Feito |
| T-08 | Minha conta: lista, editor com prévia, Pix, álbum, mensagens, perfil | RF-10…RF-16, RF-20, RF-23 | Feito |
| T-09 | Painel: resumo, anúncios com filtros, usuários com pagamento, categorias, configurações | RF-30…RF-35 | Feito |
| T-10 | Seed: 18 categorias, configuração, admin inicial, demonstração removível | — | Feito |
| T-11 | Build da Vercel com migração só em produção | ADR-09 | Feito |
| T-12 | Testes de unidade e da regra de dependência | 06-test-plan | Feito (56) |
| T-13 | Banco da Hostinger acessível pela Vercel e primeiro deploy | — | Feito (2026-11-08): migration aplicada, 18 categorias |
| T-14 | Teste ponta a ponta no navegador | — | Feito: site público, página do anúncio, cartaz, link curto e webhook conferidos em produção (2026-11-09); fluxo com Pix real feito em 2026-11-11 (criar o anúncio, gerar o Pix, pagar e entrar no ar) |
| T-15 | Visual da página impressa de referência: página branca, 5 colunas densas, tarjas nas colunas, capa e cidade como página inteira, fontes carregando | RF-04, RF-05, 04-design-system | Feito |

## Versão 0.2 (2026-11-09) — detalhes em `spec/features/`

| # | Funcionalidade | Situação |
|---|---|---|
| 002 | Capa organizada: busca, perto de mim, vitrine, como funciona, valores, contato | Feito |
| 003 | Planos Simples/Com fotos/Destaque/Vitrine, 7 ou 30 dias, Painel → Planos | Feito |
| 004 | Contato com protocolo e Painel → Chamados | Feito |
| 005 | Página do anúncio para divulgar: link curto, prévia de recorte, botões, cartaz com QR, visitas | Feito |
| 006 | Pix automático (Mercado Pago + webhook) com reserva no Pix estático; na API de Orders desde 2026-11-09 (ADR-14) | Em produção e funcionando: Pix real de R$ 10,00 pago e confirmado sozinho em 2026-11-11 (T-84). Falta conferir o cancelamento (passo 8) |
| 007 | Gol no plano Vitrine por 30 dias (cortesia) e 18 exemplos em Brasília | Feito. As fotos do Gol foram canceladas pelo Álvaro em 2026-11-11: o Gol é só exemplo, e o anúncio de verdade é o do Astra (item 3.4 do `08-lancamento.md`) |
| 008 | Teste de carga com k6 | Script pronto; falta rodar num ambiente de teste |
| 009 | Preço por período (7, 10, 15, 20, 30 dias): Simples R$ 1 a R$ 25, Com foto R$ 10 a R$ 250; Destaque e Vitrine fora de venda | Feito |

Correção na 0.2: o endereço do site passou a vir do domínio de produção da Vercel; a `NEXT_PUBLIC_URL` copiada do Pague Dez mandava link curto, QR e prévia para `paguedez.vercel.app`.

## Versão 0.3 (2026-11-10) — detalhes em `spec/features/`

| # | Funcionalidade | Situação |
|---|---|---|
| 013 | Visitas do anúncio: por pessoa (sem guardar IP), por dia e por cidade, na lista de Minha conta (total, pessoas, hoje e gráfico de 7 dias) e na tela do anúncio (30 dias e cidades); o Painel mostra o mesmo (RF-130 a RF-133, RN-130 a RN-136; ADR-18) | Feito em 2026-11-12, a pedido do Álvaro ("como a OLX"); 230 testes, typecheck e build passando, telas conferidas num banco local. Falta o segredo `VISITAS_SEGREDO` na Vercel para contar pessoas e cidades |
| 012 | Aviso de vencimento por e-mail: uma vez por dia, o dono de cada anúncio que sai nas próximas 36 horas recebe o aviso com o botão de renovar (RF-120 a RF-122, RN-120 a RN-125; ADR-17) | Feito em 2026-11-12; 190 testes, typecheck e build passando. Agendador da Vercel às 9h de Brasília. Primeiro aviso de verdade esperado em 17/11 (Astra) |
| 011 | Anúncios no Google: cada anúncio no ar no `sitemap.xml` e dados estruturados (trilha e produto com preço) na página do anúncio (RF-110 a RF-112, RN-110 a RN-114) | Feito e conferido em produção em 2026-11-12; site cadastrado no Search Console e sitemap enviado pelo Álvaro no mesmo dia (T-144). A indexação pelo Google leva alguns dias |
| 010 | Aviso de mensagem por e-mail: carta com a cara do jornal, resposta direta ou WhatsApp, limite de 10 por anúncio por dia, e-mail de teste no painel | Em produção e funcionando desde 2026-11-11. T-125 feita no mesmo dia: chave na Vercel, e-mail de teste, aviso de uma mensagem de verdade e resposta ao aviso conferidos |
| 010 | T-126: envio pelo Resend só com a chave (`RESEND_API_KEY`), pelo mesmo correio SMTP (ADR-16; RF-106, RN-106, RN-107) | Em produção desde 2026-11-11 (commit `124ec5f`, deploy das 09:58); e-mail de teste do painel recebido no mesmo dia |
| 006 | T-87: o aviso do anúncio recém-criado acompanha o pagamento e não pede Pix de anúncio que já está no ar (RN-90) | Feito em 2026-11-11; defeito achado no primeiro Pix real |
| 006 | T-86: cobrança cancelada aqui é cancelada no Mercado Pago; Pix pago depois do cancelamento fica registrado (RN-87 a RN-89) | Em produção desde 2026-11-11; confere com o Mercado Pago de verdade no passo 8 da spec |
| T-130 | Manutenção de segurança: `next` 16.0.10 → 16.4.5 e `zod` 3.25 → 4.6.7. O `npm audit` acusava 4 pacotes e agora não acusa nenhum | Em produção desde 2026-11-11; páginas públicas conferidas depois do deploy |

## Continuidade

Onde o trabalho está. Atualizar ao parar com algo pela metade (Art. 7 da constituição).

**Situação em 2026-11-12**

- Publicado: feature 011 (anúncios no `sitemap.xml` e dados para o Google, commit `12192c1`) e feature 012 (e-mail "seu anúncio sai do caderno amanhã" pelo agendador diário da Vercel, ADR-17, commit `b6da736`, deploy das 10:03 com a migration aplicada). O Álvaro cadastrou o site no Search Console e enviou o sitemap (item 3.1).
- O segredo do agendador (`CRON_SECRET`) existe na Vercel, em Preview e Production, desde cerca de 07/11/2026 (conferido pela lista de variáveis, sem ler o valor). O aviso do Astra não depende de nada do Álvaro.
- Próximo marco: T-155, o primeiro aviso de verdade, o do Astra, em 17/11/2026 por volta das 9h. Conferir com o Álvaro se chegou.
- Do lado do Álvaro, combinado na conversa da manhã: cartaz A4 com QR Code no vidro do Astra; link `/a/4DPUMX` no WhatsApp e nos grupos de compra e venda; conversar com o Igor Veículos sobre pôr o estoque da revenda no site (falta saber se ele topa e se a revenda é em Brasília). Abrir o Search Console por volta de 15/11 e ver se o sitemap aparece como "Sucesso".
- Commits só de specs sem push: `e3c36db`, `377356a` e `2cb08e9`. Vão no próximo push de código.
- Feature 013 (visitas do anúncio) feita à tarde e commitada sem push. Falta o segredo `VISITAS_SEGREDO` na Vercel (Production e Preview, o mesmo valor, 64 caracteres aleatórios): gravar segredo pela CLI foi barrado pela proteção do Claude Code e depende do Álvaro. Sem ele, o site só soma o total (RN-135). Depois do segredo: push, conferir que a migration `20261112120000_visitas_do_anuncio` rodou no build e que uma visita de verdade aparece com cidade em Minha conta.

**Conversa perdida em 2026-11-12**

O arquivo da conversa da sessão "Classificados Digital" (id `fc325e15`) sumiu do disco entre 09:55 e 10:05, com a sessão aberta e trabalhando na feature 012. O backup guarda a conversa até 09:55, quando o Álvaro disse "Sim, faz" para o aviso de vencimento. Do trecho seguinte ficaram os commits `b6da736` e `e3c36db` e esta spec; só a mensagem final da sessão se perdeu. Às 11:23 o app reabriu a sessão em branco, com outro id.

Pista nova sobre a causa: o arquivo `.last-cleanup` do Claude Code (marca a última limpeza automática) ficou com 10:04:16, dentro da janela do sumiço. Nenhuma configuração muda o prazo da limpeza (`cleanupPeriodDays` não aparece em nenhum `settings.json`), e a conversa tinha um dia, não 30. A suspeita passa a ser a limpeza automática apagando conversas de sessões em `.claude/worktrees`. Não confirmado. Claude Code 2.1.322.

Teste da suspeita, com o OK do Álvaro (2026-11-12, por volta das 11:35): `cleanupPeriodDays` passou a 36500 dias no `settings.json` do usuário, ou seja, a limpeza automática não deve apagar mais nenhuma conversa. Vale para as sessões que começarem depois da mudança; as que já estavam abertas podem ter lido o valor antigo. Se uma conversa sumir de novo com esse valor, a limpeza por prazo deixa de ser a explicação.

**Situação em 2026-11-11**

- Publicado: os commits `f773a24` (aviso de mensagem por e-mail e T-86) e `adfcbf6` (`next` 16.4.5, `zod` 4.6.7 e arquivo de verificação do Google) estão no `main`, no GitHub e em produção (deploy de 2026-11-11, 00:57). O build de produção não achou migration pendente.
- O Álvaro escolheu publicar direto. O preview da Vercel chegou a ser gerado e o build passou, mas as páginas não foram conferidas nele: o preview pede login na Vercel, e a outra saída seria criar um segredo de acesso nas configurações de segurança do projeto.
- Conferido em produção logo depois do deploy, comparando com as respostas de antes: capa, como funciona, termos (com o texto novo), login, cadastro, cidade (os mesmos 20 anúncios), seção, página do anúncio, cartaz, imagens de prévia, sitemap, robots, página 404, redirecionamento das áreas protegidas, link curto, webhook do Mercado Pago e `/googledbc5da7adb4bf446.html`. No navegador, capa e cidade sem erro de script, e a caixa de mensagem abre.
- Não conferido em produção: as áreas com login (Minha conta e Painel, inclusive a seção nova do aviso por e-mail), o envio de formulários, o Pix real e o e-mail.
- As funções do servidor passaram de 10,8 MB para 31,75 MB com o `next` 16.4.5. Está dentro do limite da Vercel; a primeira abertura depois de um tempo parado pode ficar um pouco mais lenta. Reduzir isso entra na tarefa do aviso do Turbopack (cliente do Prisma gerado em `src/generated/prisma`).
- O branch `teste-next-16-4-5` no GitHub, criado só para o preview, foi apagado em 2026-11-11 com o OK do Álvaro. Não tinha nada fora do `main`.
- Pendências que dependem do Álvaro: verificar a propriedade no Google Search Console e enviar o `sitemap.xml`; T-125 (feita no mesmo dia, ver o bloco do Resend abaixo); T-84 e T-14 (conferir o painel e fazer o Pix real de R$ 1,00); fotos do Gol (007). A ordem e os passos de cada uma estão em `08-lancamento.md`, com caixas para marcar.
- O Álvaro lembra de um defeito no Pix ("não funcionava"), mas o relato exato não está registrado em lugar nenhum. O item 2.1 do `08-lancamento.md` serve para registrá-lo.
- **E-mail pelo Resend (T-126, feito nesta data).** O Álvaro lembrou que já usa o Resend nos outros sistemas (Courtesyfy, Achei JBT, BaseMedical, cursos da Karol: pacote `resend`, `RESEND_API_KEY` e `EMAIL_FROM` com padrão `noreply@karollynemorais.com.br`). Aqui a chave vira a configuração do `CorreioSmtp` para `smtp.resend.com` (ADR-16), sem pacote novo. 161 testes, typecheck e build passando; login no Resend conferido com a chave real, sem envio.
  - A chave está no arquivo `,env` da pasta antiga (`classificadodigital\workspace\classificadosdigitalbrasil`), que o site não lê. Na Vercel ela não existia na conferência feita mais cedo em 2026-11-11 e passou a existir por volta das 09:34 (ver abaixo). O Claude não mexe em `.env` nem nas variáveis da Vercel.
  - **Publicado às 09:58.** Push dos commits `f487a22` a `124ec5f` no `main`, com o OK do Álvaro; deploy de produção pronto em 43 segundos. Antes do envio: 161 testes e typecheck passando. A `RESEND_API_KEY` aparece na lista de Production da Vercel desde cerca de 09:34 (o valor não dá para conferir por fora), então este deploy já subiu com ela e não precisa de Redeploy. Houve também um deploy de produção às 09:43, ainda com o código antigo.
  - Conferido em produção depois do deploy: capa, como funciona, termos, entrar, cadastro, Brasília, página do anúncio do Gol e o link curto dele, sitemap, robots, arquivo do Google, página 404 e o redirecionamento de Painel e Minha conta para o login.
  - Não conferido: as áreas com login, inclusive Painel → Configurações, e o envio de e-mail.
  - **E-mail de teste recebido (item 1.5).** O Álvaro clicou em *Enviar e-mail de teste* no painel e a carta chegou, com o remetente `Classificados Digitais do Brasil <noreply@karollynemorais.com.br>`, a manchete e o texto previstos. Ficam conferidos em produção: a chave do Resend, a aceitação do remetente e o envio pelo painel.
  - **Aviso de mensagem de verdade recebido (item 1.6).** O Álvaro mandou uma mensagem por um anúncio no ar e o aviso chegou por e-mail. O tempo de chegada, o texto e o contato não foram relatados.
  - **Resposta ao aviso conferida (item 1.7) e T-125 fechada.** Com contato por e-mail, o Responder do aviso aponta para quem escreveu. Não conferido em produção: o contato por telefone, com o link do WhatsApp, coberto só pelos testes (RF-101); e a seção do painel na tela, que pede login.
  - Próximo do checklist: Prioridade 2, Pix automático, começando pelo item 2.1 (registrar o erro exato).
- **Primeiro anúncio de verdade e Pix real em andamento.** Anúncio do Astra do Álvaro criado às 14:20 pela conta de anunciante dele (código `4DPUMX`, Veículos, Brasília, plano Com foto por 7 dias). O Mercado Pago gerou a cobrança `X33MFGE43S`, de R$ 10,00, sem erro, e a tela mostrou o QR Code e o "copia e cola". O Álvaro pagou e a confirmação entrou às 14:26: **o anúncio está no ar até 18/11 e o Pix automático funciona de ponta a ponta** (T-84 e T-14 feitas). As seis fotos foram subidas por ele em seguida; a página pública mostra o anúncio completo.
  - Defeito achado no pagamento (T-87, RN-90): depois de confirmar, a tela continuava dizendo "Anúncio salvo. Pague o Pix abaixo…", sem Pix nenhum abaixo, e dava a impressão de anúncio no ar sem pagamento. Era o defeito que o Álvaro lembrava. Corrigido com teste: 162 testes, typecheck e build passando. Publicado no commit `998b533` (deploy de produção das 14:32) e conferido na tela do anúncio: com o Pix pago, o aviso diz "Pagamento confirmado. O anúncio está no caderno até 18/11/2026." e não pede mais o Pix. Textos e lista de fotos em `anuncios/astra-sedan-2002.md`. Ele não vai publicar na OLX (plano gratuito no limite de anúncios).
- **Alerta do GitGuardian (incidente 39924674, "SMTP credentials").** Alarme falso. Aponta a linha de `tests/unit/aviso-de-mensagem.test.ts` que confere a porta 587 com usuário que não é e-mail (commit `f773a24`). Servidor, usuário e senha ali foram inventados para o teste; o próprio GitGuardian testou e marcou como inválidos. Não muda código. No painel do GitGuardian, o Álvaro marca o incidente como credencial de teste (Ignore → Test credential).
- **O repositório no GitHub é público, e o Álvaro decidiu mantê-lo assim (2026-11-11).** Qualquer pessoa lê o código e a pasta `spec/`. Varredura de todo o histórico em 2026-11-11 (19 commits): nenhuma chave, senha ou token de verdade, só os modelos do `.env.example`; nenhum arquivo `.env` versionado; o nome do banco e o e-mail do administrador não aparecem. Por isso, segredo e dado pessoal não entram em `spec/` nem em teste.

**Situação em 2026-11-10**

- Decisão do Álvaro: antes de divulgar o site, resolver o aviso de mensagem ao anunciante e ligar o Pix automático.
- Feito no código nesta data: 010 (aviso de mensagem por e-mail) e T-86 (cancelar a ordem no Mercado Pago). 137 testes, typecheck e build passando. Os dois entram no ar no próximo deploy de produção.
- 006 Pix automático: as credenciais já estão na Vercel e no deploy de produção em vigor (passo 5 feito). Faltam os passos 6 e 7 (ver *Onde parou* em `features/006-pix-automatico/spec.md`).
- Pendências abertas que dependem do Álvaro: T-125 (variáveis `SMTP_*` na Vercel e e-mail de teste), T-84 e T-14 (conferir o painel e fazer o Pix real de R$ 1,00), fotos do Gol (007). Rodar o k6 (008) segue pendente.
- T-130, manutenção de segurança feita em seguida, a pedido do Álvaro:
  - `next` 16.0.10 → 16.4.5. A 16.0.10 tinha 42 avisos conhecidos, alguns críticos; todos estão corrigidos a partir da 16.4.1, e a 16.4.5 traz as correções de segurança de novembro. A 16.4.6 saiu na véspera e só tem ajustes que não são de segurança, por isso ficou de fora. Com o `next` novo saem também os avisos do `postcss` e do `sharp`.
  - `zod` 3.25 → 4.6.7. A correção da GHSA-mrhx-c7xc-m3w5 (lista enorme esgotando a memória na validação) só existe na linha 4. Mudou um tipo em `src/lib/formularios.ts`; `tests/unit/formularios.test.ts` foi escrito antes, com o Zod 3, e passa igual com o 4.
  - `npm audit` sem avisos; 156 testes, typecheck e build passando. No servidor local: login, cadastro, termos, imagem de prévia, redirecionamento das áreas protegidas e a validação do formulário de login pela Server Action.
  - **Não conferido**: as páginas que consultam o banco rodando com o `next` novo. O banco recusa as credenciais do `.env` desta máquina, então isso só aparece num deploy. Antes de publicar no `main`, conferir num preview da Vercel.
  - Aviso novo no build (Turbopack): *Dynamic filesystem access causes tracing of the whole project*, causado pelo cliente do Prisma gerado em `src/generated/prisma`. O build não quebra. Ele passa a rastrear 683 arquivos (43 MB), inclusive `spec/` e `tests/`, que não fazem falta no servidor. O aviso some quando o cliente do Prisma for gerado no lugar padrão ou o Prisma for atualizado; é tarefa própria.
- Google Search Console: o Álvaro baixou o arquivo de verificação `googledbc5da7adb4bf446.html`. Ele fica em `public/`, porque o Next só serve arquivo estático dali (na raiz do projeto não é servido). Conferido no servidor local: responde 200 com o conteúdo exato, e o `robots.txt` não o bloqueia. A verificação no Google só passa depois do deploy de produção; em seguida, enviar o `sitemap.xml` no Search Console.
- Atenção à pasta: `classificadodigital\workspace\classificadosdigitalbrasil` é uma cópia antiga do repositório (ainda com os arquivos do projetobase). O código em uso é o desta pasta, dentro de `.claude\worktrees\classificados-digital-493fea`.

**Situação em 2026-11-09**

- Último commit de código: `5122172` (ADR-14), no `main` e no GitHub.
- O passo 5 do Pix automático (credenciais na Vercel) estava sem registro; foi conferido em 2026-11-10.

**Conversa perdida em 2026-11-11**

O arquivo da conversa da sessão "Classificados Digital" sumiu do disco por volta das 09:16, com a sessão aberta, e às 09:47 o app reabriu a sessão em branco. O backup em `C:\Users\alvar\Backup-Claude` guarda a conversa até as 09:10. Do trecho de 09:10 a 09:47 ficou só o que está nesta spec e nos commits: não há registro de quem cadastrou a `RESEND_API_KEY` na Vercel nem do motivo do deploy das 09:43. Código e specs não foram afetados.

**Conversas perdidas em 2026-11-09**

Os arquivos das conversas de duas sessões sumiram do disco: "Classificados Digital" (última atividade às 16:01) e "Classificados Digital · continuação" (última atividade registrada às 18:30). Código e specs não foram afetados. O que foi combinado só nessas conversas e não está em `spec/` precisa ser informado de novo. Causa não identificada; as duas rodavam dentro de `.claude/worktrees`.

Proteção adotada: a tarefa agendada do Windows *Backup conversas Claude* copia as conversas a cada 15 minutos para `%USERPROFILE%\Backup-Claude`. Ela nunca apaga o que já copiou. Fica no mesmo disco, então não cobre falha do disco.

## Próximas versões

Ver `07-insights.md`: créditos (carteira), e-mail de aviso de vencimento e de anúncio no ar, aviso de chamado novo para o administrador, subir para o topo.
