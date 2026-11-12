# 01 · Especificação funcional (versão 0.1)

Classificados por cidade no formato do caderno de jornal. O anunciante paga R$ 1,00 por 7 dias de anúncio.

## Perfis

| Perfil | O que faz |
|---|---|
| Visitante | Procura por UF, cidade e seção; manda mensagem; vê o álbum. Não precisa de conta. |
| Anunciante | Cria conta com dados pessoais, publica N anúncios, paga cada um por Pix, lê as mensagens. |
| Administrador | Confirma pagamentos, modera anúncios, cadastra categorias, configura Pix e preço. |

## Requisitos funcionais

### Site público

| ID | Requisito |
|---|---|
| RF-04 | A capa mostra o título "Classificados" e, logo abaixo, os filtros UF → Cidade → Seção → Pesquisar. |
| RF-05 | Cada cidade e cada seção têm endereço próprio: `/df/brasilia` e `/df/brasilia/veiculos`. A página da cidade é a página inteira do caderno: todas as seções em colunas, até 8 anúncios cada, com "ver todos". |
| RF-06 | A página da seção mostra os anúncios no ar daquela cidade, em colunas de jornal, 40 por página, quem pagou por último primeiro. |
| RF-07 | Cada anúncio tem página própria (`/anuncio/<código>`) para compartilhar. |
| RF-17 | No rodapé do quadrado, o ícone de conversa abre uma caixa (modal) para o visitante deixar nome, contato e mensagem. |
| RF-18 | Quando há fotos, o ícone de álbum (fotos sobrepostas, com a quantidade) abre a galeria. |

### Anunciante

| ID | Requisito |
|---|---|
| RF-01 | Cadastro com nome, CPF, e-mail, celular, UF, cidade, senha e aceite dos termos. Entra logado. |
| RF-02 | Login por e-mail e senha; sessão de 30 dias renovada com o uso. |
| RF-10 | Cadastro de anúncio numa tela com a cara do anúncio: o quadrado ao lado muda enquanto se escreve. |
| RF-11 | Lista dos próprios anúncios com situação, prazo, mensagens novas e pendência de Pix. |
| RF-12 | Formatação dinâmica, sempre na mesma cor: moldura (sem, simples, dupla, tracejada), título (negrito, tarja preta, sublinhado), alinhamento (esquerda, centro) e estrelas. |
| RF-13 | Remover o anúncio do caderno. |
| RF-14 | Ao salvar, o sistema gera o Pix (QR Code e copia e cola) com o valor e um identificador. |
| RF-15 | Renovar: gera nova cobrança; confirmada, soma os dias. |
| RF-16 | Álbum com até 6 fotos (envio direto ao Cloudinary, reordenar, remover). |
| RF-20 | Editar os dados pessoais (o CPF não muda). |
| RF-21 | Trocar a senha. |
| RF-23 | Ler as mensagens recebidas em cada anúncio. |

### Administrador

| ID | Requisito |
|---|---|
| RF-30 | Cadastro de categorias: criar, renomear, ordenar, ativar/desativar, excluir quando vazia. |
| RF-31 | Lista de usuários paginada, informando quem pagou, quanto, quantas vezes e quem tem Pix pendente. |
| RF-33 | Lista de anúncios com filtros de data inicial e final, estado, cidade, seção e situação, paginada. |
| RF-34 | Confirmar o Pix de um anúncio, remover e restaurar anúncios. |
| RF-35 | Configurar chave Pix, nome e cidade do recebedor, valor e dias do anúncio. |

### Avisos por e-mail (feature 010)

| ID | Requisito |
|---|---|
| RF-100 | Quando alguém manda mensagem a um anúncio no ar, o dono recebe um e-mail no endereço da conta, com o anúncio, quem escreveu, o texto, o contato e o link para Minha conta. |
| RF-101 | Contato em e-mail vira o endereço de resposta do aviso; contato em telefone ganha o link do WhatsApp. |
| RF-102 | Quem escreve não espera o envio do e-mail: o aviso sai depois da resposta. |
| RF-103 | Painel → Configurações mostra a situação do aviso por e-mail e envia um e-mail de teste ao administrador. |
| RF-104 | Sem servidor de e-mail configurado, a mensagem fica só em Minha conta, como antes. |
| RF-105 | Minha conta diz em que endereço o dono é avisado. |
| RF-106 | Com a chave do Resend cadastrada (`RESEND_API_KEY`), o envio sai pelo Resend sem mais nenhuma variável obrigatória. |
| RF-110 | Todo anúncio no ar entra no `sitemap.xml` com o endereço público e a data de publicação; ao sair do ar, sai do sitemap. |
| RF-111 | A página do anúncio traz dados estruturados (JSON-LD) com a trilha Início › cidade › seção › anúncio. |
| RF-112 | Anúncio com preço traz também o produto e a oferta: título, texto, seção, fotos, preço em reais, validade e cidade. |
| RF-120 | Uma vez por dia, o dono de cada anúncio no ar que sai do caderno nas próximas 36 horas recebe um e-mail com o dia e a hora em que sai, as visitas até agora, o botão para renovar e o link do anúncio. |
| RF-121 | A tarefa do aviso de vencimento roda sozinha pelo agendador da Vercel, às 9h de Brasília, e responde com o resumo da rodada. |
| RF-122 | Sem servidor de e-mail, o aviso de vencimento não envia nem marca nada. |

## Regras de negócio

| ID | Regra |
|---|---|
| RN-01 | E-mail único por conta. |
| RN-02 | CPF válido e único por conta. |
| RN-03 | Login: 10 falhas por IP em 15 minutos bloqueiam novas tentativas. Mesma mensagem para e-mail inexistente e senha errada. |
| RN-04 | A cidade precisa existir no catálogo do IBGE e pertencer à UF escolhida. |
| RN-10 | Anúncio nasce "aguardando pagamento", com a cobrança já aberta. |
| RN-11 | Texto e formatação mudam a qualquer momento; o prazo no ar não muda com a edição. |
| RN-12 | Pagar de novo soma dias: se ainda está no ar, os dias entram depois do fim atual; se expirou, contam a partir da confirmação. |
| RN-13 | Está no ar = publicado e com expiração no futuro. Expira sozinho, sem agendador. |
| RN-14 | Anúncio removido sai do caderno na hora e tem as cobranças pendentes canceladas. Só o admin restaura. |
| RN-17 | Só anúncio no ar recebe mensagem. |
| RN-18 | No máximo 3 mensagens do mesmo contato para o mesmo anúncio em 24 horas. Campo-isca contra robôs. |
| RN-20 | Preço padrão: R$ 1,00 por 7 dias, configurável pelo admin. |
| RN-21 | No máximo uma cobrança pendente por anúncio; o valor é o da tabela no momento da cobrança. |
| RN-22 | Confirmar o pagamento e publicar o anúncio acontecem na mesma transação; um pagamento não é confirmado duas vezes. |
| RN-31 | Categoria com anúncios não é excluída, só desativada. Quem já anunciava nela continua podendo editar. |
| RN-84 | A cobrança automática é uma ordem da API de Orders do Mercado Pago. Só a ordem `processed` confirma; `failed`, `canceled`, `refunded`, `charged_back` e `expired` contam como recusada; qualquer outra situação segue pendente. |
| RN-85 | O valor conferido na confirmação automática é o `total_paid_amount` da ordem (na falta dele, o `total_amount`). |
| RN-86 | O webhook só processa aviso do tipo `order` com identificador de ordem (`ORD…`). Os demais recebem 200 e são ignorados. |
| RN-87 | Cobrança do gateway cancelada aqui (troca de plano ou período, Pix vencido, anúncio removido, cortesia) é cancelada também no Mercado Pago. Falha do gateway não impede o cancelamento daqui. |
| RN-88 | Se o Pix já foi pago, a cobrança não é cancelada: troca de plano e cortesia são recusadas e a confirmação segue o caminho normal. |
| RN-89 | Pix aprovado em cobrança já cancelada aqui não publica nada e fica registrado como `PAGO_APOS_CANCELAMENTO` para o admin resolver. |
| RN-90 | O aviso da tela do anúncio recém-criado acompanha o pagamento: com o Pix em aberto, pede o pagamento; depois de pago, diz que o pagamento foi confirmado e até quando o anúncio fica no caderno. A tela nunca pede Pix de anúncio que já está no ar. |
| RN-100 | O aviso por e-mail nunca impede a mensagem: falha no envio vai para o log e a mensagem continua gravada. |
| RN-101 | No máximo 10 avisos por anúncio em 24 horas, contados pelas mensagens recebidas; o décimo diz que as próximas ficam só em Minha conta. |
| RN-102 | O aviso vai só para o e-mail da conta do dono e não leva CPF nem celular dele. |
| RN-103 | Nome e texto de quem escreveu entram no e-mail como texto, nunca como HTML; o endereço de resposta só é usado em formato simples. |
| RN-104 | Dono com a conta desativada não recebe aviso. |
| RN-105 | Todo aviso traz o lembrete: o site não pede pagamento, código nem senha por mensagem. |
| RN-106 | Servidor de envio: SMTP informado (`SMTP_HOST`, `SMTP_USER` ou `SMTP_PASS`) tem preferência; sem ele, vale o Resend (`RESEND_API_KEY`); sem nenhum, o aviso fica desligado. |
| RN-107 | No Resend o remetente é `noreply@karollynemorais.com.br`; `EMAIL_FROM` troca o endereço (`endereco@dominio` ou `Nome <endereco@dominio>`), e em formato inválido desliga o aviso. O nome exibido é sempre o do site. |
| RN-110 | Os dados estruturados só repetem o que a página mostra a qualquer visitante; nunca nome, CPF, e-mail ou celular do dono. |
| RN-111 | Anúncio sem preço não vira produto nos dados estruturados; fica só a trilha. |
| RN-112 | Anúncio de Empregos e Formação Profissional não vira produto nos dados estruturados. |
| RN-113 | O texto do anunciante entra no JSON-LD com `<`, `>` e `&` escapados (`<`, `>`, `&`), para nunca fechar o bloco nem virar código. |
| RN-114 | O sitemap leva no máximo 40.000 anúncios, os publicados mais recentemente primeiro. |
| RN-120 | Um aviso de vencimento por prazo: o anúncio guarda a data de fim já avisada; renovar muda a data e o prazo novo ganha o seu aviso. Rodar duas vezes não manda dois e-mails. |
| RN-121 | Falha no envio do aviso de vencimento desfaz a marca, e o anúncio volta na rodada seguinte. |
| RN-122 | Não recebem aviso de vencimento: conta desativada e endereço em domínio reservado para teste (`.test`, `.example`, `.invalid`, `.localhost`, `example.com`, `example.net`, `example.org`). |
| RN-123 | A rota da tarefa só roda com o segredo do agendador (`CRON_SECRET`); sem a variável, recusa sempre. |
| RN-124 | No máximo 200 avisos de vencimento por rodada. |
| RN-125 | A carta do vencimento só leva o primeiro nome do dono e lembra que renovar é sempre pelo site. |

## Requisitos não funcionais

| ID | Requisito |
|---|---|
| RNF-01 | Toda consulta de anúncios do site é de uma cidade e uma seção, com índice `(cidadeCodigo, categoriaId, situacao, expiraEm)`. A página da cidade faz uma consulta limitada por seção que tem anúncio; a capa não consulta anúncios. |
| RNF-02 | Fotos entregues pelo Cloudinary com formato e qualidade automáticos. |
| RNF-03 | Funciona no celular com 16 px de margem e sem rolagem horizontal. |
| RNF-04 | Cabeçalhos de segurança (CSP, X-Frame-Options, nosniff). |
| RNF-05 | Termos de uso e privacidade publicados em `/termos`. |
