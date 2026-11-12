# 013 · Visitas do anúncio

## Spec

**Problema.** O dono do anúncio só vê um total de "visitas" que soma toda abertura da página, inclusive as dele mesmo, as prévias de link do WhatsApp e os robôs de busca. Ele não sabe quantas pessoas viram, se o anúncio está sendo visto agora nem de onde vêm as visitas, e por isso não sabe se a divulgação está dando resultado. Pedido do Álvaro em 2026-11-12: um contador por IP ou por localização, como o da OLX, que apareça na lista de anúncios.

**Quem usa.** O anunciante, em Minha conta; o administrador, no Painel.

| ID | Requisito |
|---|---|
| RF-130 | A página do anúncio avisa a visita pelo navegador, depois de aberta. Contam duas coisas: visitas (aberturas da página) e pessoas (a mesma conexão de internet com o mesmo aparelho conta uma pessoa). |
| RF-131 | Na lista de Minha conta, cada anúncio mostra o total de visitas, o total de pessoas, as visitas de hoje e um gráfico de barras com as visitas dos últimos 7 dias. |
| RF-132 | Na tela do anúncio em Minha conta, a seção Visitas mostra: visitas, pessoas, hoje e últimos 7 dias; o gráfico dos últimos 30 dias, com a tabela dos números por dia; e as cidades de onde vêm as pessoas (até 10, e o resto somado em "outras cidades"). |
| RF-133 | O Painel mostra a mesma seção na tela do anúncio. |

| ID | Regra |
|---|---|
| RN-130 | Não contam: o dono logado vendo o próprio anúncio, o administrador logado, robôs e prévias de link (WhatsApp, Facebook, Google e afins), aviso vindo de outro site e anúncio fora do ar. |
| RN-131 | O IP nunca é gravado. A pessoa vira uma chave HMAC-SHA-256 do anúncio, do IP (o IPv6 só pela rede, /64) e do navegador, com o segredo `VISITAS_SEGREDO`. A chave muda de um anúncio para outro: não dá para seguir alguém de um anúncio a outro nem voltar ao IP sem o segredo. |
| RN-132 | A cidade é a localização aproximada da conexão, informada pela Vercel; o site não pede a localização a ninguém. Fica gravado só cidade, UF e país. A tela avisa que é aproximada. |
| RN-133 | O dia é o de Brasília. |
| RN-134 | O navegador avisa no máximo uma visita a cada 30 minutos por anúncio. No servidor, a mesma pessoa soma no máximo 20 visitas por dia em cada anúncio. |
| RN-135 | Sem o segredo, só o total de visitas é somado, e a tela não mostra pessoas nem cidades. |
| RN-136 | O total de visitas continua do número que cada anúncio já tinha. Pessoas, dias e cidades contam a partir desta entrega. |

**Aceite.** Alguém abre o anúncio do Astra pelo celular: em Minha conta, a lista mostra uma visita a mais, uma pessoa, e a barra de hoje cresce. Recarregar a página em seguida não soma. O dono abrindo o próprio anúncio não soma. O WhatsApp montando a prévia do link não soma. Na tela do anúncio aparece a cidade aproximada dessa pessoa.

## Plano (ADR-18)

- **Domínio** (`domain/anuncio/visitas.ts`): `normalizarIp` e `ehRobo` (os mesmos do contador do portfólio do Álvaro), `diaDeBrasilia`, `localDaVisita` (limpa o que a Vercel manda), `resumirVisitas` (série de dias com os dias sem visita em zero, e os totais) e `cidadesDasVisitas` (as 10 primeiras e o resto somado).
- **Aplicação**: portas `VisitasRepository` (`registrar` responde `NOVA`, `REPETIDA` ou `NO_LIMITE`) e `AnonimizadorDeVisitante`; `AnuncioRepository.buscarPorCodigo`. O caso de uso `RegistrarVisitaUseCase` substitui o antigo, que só somava. Consulta `VisitasQuery`: dias e pessoas de vários anúncios de uma vez (lista), cidades de um anúncio (tela).
- **Banco**: tabela `visitas_anuncio`, uma linha por anúncio, dia e pessoa: `anuncioId`, `dia` (DATE), `chave` (64), `vezes`, `cidade`, `uf`, `pais`; chave primária `(anuncioId, dia, chave)`. `anuncios.visualizacoes` continua sendo o total de visitas (RN-136). Migration `20261112120000_visitas_do_anuncio`, aplicada no deploy de produção (ADR-09).
- **Registro**: primeiro um `UPDATE ... SET vezes = vezes + 1 WHERE ... AND vezes < 20`; se não mudou nada, `INSERT IGNORE` da linha do dia. Uma das duas mexeu numa linha: a visita conta e o total do anúncio sobe. Nenhuma mexeu: a pessoa chegou ao limite do dia (RN-134). Assim o resultado não depende de como o MySQL conta linhas iguais num `ON DUPLICATE KEY UPDATE`.
- **Rota** `POST /api/visitas`: responde sempre 204 e nunca quebra a página. Lê o IP (`x-forwarded-for`, que a Vercel reescreve), o navegador, a localização (`x-vercel-ip-city`, `x-vercel-ip-country-region`, `x-vercel-ip-country`) e a sessão. Recusa aviso de outro site pelo `Sec-Fetch-Site` ou pelo `Origin`.
- **Navegador**: componente `AvisoDeVisita` na página do anúncio, com `fetch` `keepalive` e a hora do último aviso no `localStorage` (RN-134). A soma feita na montagem da página sai: pré-carregamento de links, prévias e robôs que não rodam JavaScript deixam de contar.
- **Infraestrutura**: `HmacAnonimizadorDeVisitante`, com segredo de pelo menos 32 caracteres e o prefixo `visita:v1:` no texto assinado.
- **Tela**: `components/visitas/`, componentes de servidor. Na lista, uma linha com os números e o gráfico de 7 barras; na tela do anúncio, a seção completa. Barras em HTML e CSS na cor da tinta, sem biblioteca de gráficos.
- **Termos**: parágrafo sobre a contagem de visitas na política de privacidade.
- Por que IP mais navegador: nas redes de celular muitos aparelhos saem pelo mesmo IP (CGNAT); só o IP juntaria pessoas diferentes numa só. O navegador separa a maioria delas. O mesmo celular com dois navegadores conta duas pessoas, o que é raro.
- Por que a chave é por anúncio: o dono vê só o anúncio dele, e o site não precisa saber que a mesma pessoa viu dois anúncios.

## Tarefas

- [x] T-160 Regras do domínio, com testes (RN-131, RN-132, RN-133, RN-134; `tests/unit/visitas.test.ts`)
- [x] T-161 Portas, caso de uso e repositório falso, com testes (RF-130, RN-130, RN-134, RN-135). *40 testes novos; 230 no total.*
- [x] T-162 Tabela, migration e repositório no Prisma; consulta das visitas. *Migration e consultas conferidas num banco local (MariaDB do XAMPP, `cdb_local_visitas`).*
- [x] T-163 Rota `POST /api/visitas` e aviso pelo navegador; tirar a soma da montagem da página. *Conferido no navegador, local: a visita sem login entra (linha do dia, chave cifrada); recarregar não soma; o dono logado não soma. A página do anúncio continua montada a cada acesso no build (ƒ).*
- [x] T-164 Lista e tela do anúncio em Minha conta; tela do anúncio no Painel (RF-131, RF-132, RF-133). *Lista e tela do anúncio conferidas no navegador, no computador e no tamanho de celular, com visitas de exemplo. O Painel usa a mesma seção; não foi aberto.*
- [ ] T-165 Segredo `VISITAS_SEGREDO` na Vercel, termos, publicar e conferir em produção. *Termos feitos. Criar o segredo pela CLI foi barrado pela proteção do Claude Code (gravar segredo pede permissão do Álvaro); falta ele criar ou autorizar.*

## Depois

- De onde veio a visita: WhatsApp, cartaz (QR Code), Google, caderno do site. Pede marcar o link de cada botão de divulgar e o do QR Code.
- Quantas visitas viraram mensagem (taxa de contato), ao lado do total de mensagens.
- Apagar, pelo agendador diário, as linhas com mais de um ano.
