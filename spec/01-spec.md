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

### Visitas do anúncio (feature 013)

| ID | Requisito |
|---|---|
| RF-130 | A página do anúncio avisa a visita pelo navegador, depois de aberta. Contam visitas (aberturas da página) e pessoas (a mesma conexão com o mesmo aparelho é uma pessoa). |
| RF-131 | Na lista de Minha conta, cada anúncio mostra o total de visitas, de pessoas, as visitas de hoje e o gráfico dos últimos 7 dias. |
| RF-132 | Na tela do anúncio em Minha conta: visitas, pessoas, hoje, últimos 7 dias, o gráfico de 30 dias com a tabela por dia e as cidades de onde vêm as pessoas (até 10, e "outras cidades"). |
| RF-133 | O Painel mostra a mesma seção na tela do anúncio. |

### Ativar e desativar o anúncio (feature 014)

| ID | Requisito |
|---|---|
| RF-140 | Na tela do anúncio e na lista de Minha conta, o anúncio no ar tem o botão Desativar anúncio, e o desativado tem o botão Ativar anúncio, que o põe de volta no caderno. |
| RF-141 | A situação Desativado aparece no selo, em Minha conta e no Painel; o Painel filtra por ela e tem os mesmos botões na tela do anúncio. |

### Código por e-mail (feature 016)

| ID | Requisito |
|---|---|
| RF-150 | Ao criar a conta, o site manda ao e-mail um código de 6 números; a conta só é liberada depois que a pessoa digita o código. |
| RF-151 | Sem o e-mail confirmado, quem entra cai na tela do código: não vê Minha conta, não cria nem paga anúncio. |
| RF-152 | Na tela do código, a pessoa pede outro código e corrige o e-mail digitado errado. |
| RF-153 | "Esqueci a senha": código no e-mail e senha nova; a conta entra logada e as outras sessões caem. |
| RF-154 | Em Meus dados, o e-mail novo só vale depois do código mandado para ele; a troca pode ser cancelada. |
| RF-155 | O e-mail antigo recebe um aviso quando a troca acontece. |
| RF-156 | O Painel marca, na lista de usuários, quem não confirmou o e-mail. |

### Banco de dias (feature 017)

| ID | Requisito |
|---|---|
| RF-170 | Minha conta mostra no alto o saldo do banco: dias sem foto e dias com foto. |
| RF-171 | A página Banco de dias lista o saldo e cada entrada e saída, com data, tipo, quantidade, motivo e anúncio. |
| RF-172 | Ao criar o anúncio, quem tem saldo escolhe entre Pix e dias do banco, e quantos dias usar. |
| RF-173 | No anúncio vencido, no ar ou desativado, a mesma escolha vale para renovar ou prolongar. |
| RF-174 | Painel → Configurações liga e desliga o presente de boas-vindas. |
| RF-175 | Painel → Usuários mostra o saldo do banco de cada conta. |

### Kit de divulgação (feature 020)

| ID | Requisito |
|---|---|
| RF-200 | O anúncio no ar tem, em Minha conta, a seção Divulgar: imagem para o status, imagem quadrada, texto pronto, link curto, envio pelo WhatsApp e cartaz. |
| RF-201 | Imagem para o status (1080 × 1920) com a cara do caderno, a palavra do cartaz, a primeira foto, título, texto, preço, cidade, seção e o link curto. |
| RF-202 | Imagem quadrada (1080 × 1080) para grupos e redes, com o mesmo conteúdo. |
| RF-203 | No celular que permite, "Compartilhar com a imagem" abre o compartilhar do aparelho com a imagem e o texto; nos outros, baixar e copiar. |
| RF-204 | Texto pronto com título, preço, cidade, começo do texto e link curto, copiado com um toque. |
| RF-205 | O aviso de recém-publicado e a lista de Minha conta levam à seção Divulgar. |

### Convites de cortesia (feature 015)

| ID | Requisito |
|---|---|
| RF-250 | Toda conta de anunciante tem 5 convites; Minha conta mostra quantos restam e os enviados, com a situação. |
| RF-251 | Convidar por e-mail: a carta leva o link do convite. |
| RF-252 | Convidar pelo WhatsApp: o site cria o convite e abre o WhatsApp do dono com o texto e o link. |
| RF-253 | O link abre a página com quem convidou, o presente de boas-vindas e o botão para criar a conta. |
| RF-254 | A conta criada pelo convite fica ligada a ele; na primeira publicação dela, quem convidou ganha 7 dias com foto. |
| RF-255 | O convite ainda não aceito pode ser cancelado e volta. |
| RF-256 | Painel → Configurações liga e desliga os convites; o resumo conta enviados, aceitos e premiados. |

### QR Code do anúncio (feature 022)

| ID | Requisito |
|---|---|
| RF-220 | Um componente do sistema gera o QR Code do anúncio, usado no cartaz, na página do anúncio, nas imagens de divulgação e no arquivo do QR. |
| RF-221 | A página pública do anúncio mostra o QR Code com "Aponte a câmera do celular para abrir este anúncio". |
| RF-222 | As imagens para o status e quadrada trazem o QR Code junto do link curto. |
| RF-223 | A seção Divulgar oferece o QR Code sozinho para baixar. |

### Fechou negócio? (feature 021)

| ID | Requisito |
|---|---|
| RF-210 | A tela do anúncio em Minha conta pergunta "Fechou negócio?": sim, pelo Classificados; sim, por outro lugar; ainda não. |
| RF-211 | O e-mail do vencimento traz "Já fechou negócio? Conte pra gente", com o link para a pergunta. |
| RF-212 | Quem responde "sim" com o anúncio no ar recebe a oferta de tirá-lo do caderno. |
| RF-213 | O Painel conta as respostas e mostra a de cada anúncio. |

### Cartaz com VENDE-SE (feature 019)

| ID | Requisito |
|---|---|
| RF-190 | O alto do cartaz A4 traz uma palavra grande: VENDE-SE, ALUGA-SE ou CLASSIFICADOS; com as duas primeiras, o jornal, a cidade e a seção vão numa linha menor logo abaixo. |
| RF-191 | Acima do cartaz, fora da impressão, quem vai imprimir escolhe a palavra. |

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
| RN-130 | Não contam como visita: o dono logado vendo o próprio anúncio, o administrador logado, robôs e prévias de link, aviso vindo de outro site e anúncio fora do ar. |
| RN-131 | O IP nunca é gravado: a pessoa é uma chave HMAC-SHA-256 do anúncio, do IP (IPv6 pela rede /64) e do navegador, com o segredo `VISITAS_SEGREDO`. A chave muda de um anúncio para outro. |
| RN-132 | A cidade da visita é a aproximada da conexão, informada pela Vercel; fica gravado só cidade, UF e país, e a tela avisa que é aproximada. |
| RN-133 | O dia das visitas é o de Brasília. |
| RN-134 | O navegador avisa no máximo uma visita a cada 30 minutos por anúncio; no servidor, a mesma pessoa soma no máximo 20 visitas por dia em cada anúncio. |
| RN-135 | Sem o segredo, só o total de visitas é somado, e a tela não mostra pessoas nem cidades. |
| RN-136 | O total de visitas continua do número que cada anúncio já tinha; pessoas, dias e cidades contam desde 12/11/2026. |
| RN-140 | Desativado é fora do caderno: não aparece na seção nem no sitemap, a página pública diz que está fora do ar, não recebe mensagem e não conta visita. Texto, fotos, visitas e pagamentos ficam. |
| RN-141 | O prazo pago continua correndo enquanto o anúncio está desativado; ativar devolve o anúncio ao caderno até a mesma data de antes. |
| RN-142 | Só se desativa anúncio no ar, e só se ativa desativado com prazo. Desativado com prazo vencido aparece como Expirado e volta pela renovação. |
| RN-143 | Pagar a renovação (ou a cortesia) de um desativado o põe no ar; os dias somam ao fim atual se ele ainda não passou (RN-12). |
| RN-144 | Desativado não recebe o e-mail "seu anúncio sai do caderno amanhã". |
| RN-145 | Dono e administrador desativam e ativam; removido e aguardando o primeiro pagamento, não. |
| RN-150 | O código tem 6 números aleatórios, vale 15 minutos e fica no banco só como hash. |
| RN-151 | No máximo 5 tentativas erradas por código; depois, só pedindo outro. |
| RN-152 | Outro código só 60 segundos depois do anterior, e no máximo 5 por hora por conta e finalidade; o novo invalida o anterior. |
| RN-153 | Cada código serve a uma finalidade (cadastro, troca de e-mail, senha nova) e a um uso. |
| RN-154 | As contas anteriores à feature 016 e o administrador do seed contam como confirmados. |
| RN-155 | Para "um e-mail por conta", o que vem depois do `+` não conta, e no Gmail os pontos também não. |
| RN-156 | "Esqueci a senha" responde igual exista ou não a conta; o código só sai para conta ativa, depois da resposta. |
| RN-157 | Criar a senha nova pelo código também confirma o e-mail. |
| RN-158 | Sem servidor de e-mail o código não sai e a tela avisa; fora da produção, a carta vai para o terminal. |
| RN-159 | A carta do código leva só o primeiro nome, diz para que serve e lembra que o site nunca pede o código por telefone ou mensagem. |
| RN-170 | O banco guarda dias de dois tipos: sem foto (plano Simples) e com foto (plano Com foto). |
| RN-171 | Usar dias do banco publica ou prolonga no plano do tipo de dia usado; anúncio Com foto em prazo só recebe dias com foto. |
| RN-172 | Anúncio novo ou vencido usa no mínimo 7 dias do banco; anúncio em prazo (no ar ou desativado) aceita a partir de 1. |
| RN-173 | Nunca se usa mais do que o saldo; o desconto é condicionado ao saldo, e se a publicação falhar os dias voltam, com registro. |
| RN-174 | Presente de boas-vindas: 7 dias sem foto e 7 com foto, uma vez, ao confirmar o e-mail; não ganham administrador, conta desativada e e-mail de teste; desligado no Painel, ninguém ganha. |
| RN-175 | As contas de anunciante existentes em 2026-11-15, ativas e sem e-mail de teste, receberam o presente na migration. |
| RN-176 | No máximo 5 contas novas pela mesma conexão em 24 horas; a conexão do cadastro fica guardada. |
| RN-177 | Os dias do banco não vencem. |
| RN-178 | Toda entrada e saída do banco fica no extrato. |
| RN-179 | Usar dias do banco cancela a cobrança Pix em aberto do anúncio; se o Pix já foi pago, o uso é recusado e os dias voltam. |
| RN-180 | Tabela proporcional: o dia custa o mesmo em 7, 15 e 30 dias (sem foto R$ 1,00, R$ 2,14, R$ 4,29; com foto R$ 10,00, R$ 21,43, R$ 42,86); 10 e 20 dias saíram da venda. |
| RN-181 | O uso do banco aparece nos pagamentos do anúncio como "Dias do banco", com valor zero. |
| RN-200 | As imagens do kit só existem para anúncio no ar; fora do ar, "não encontrado". |
| RN-201 | Imagens e texto pronto mostram só o que a página pública mostra; nunca dados do dono. |
| RN-202 | A foto entra só se o anúncio tiver foto; sem foto, o texto sai maior. |
| RN-203 | O texto do anúncio entra resumido sem cortar palavra, com reticências. |
| RN-204 | O link das imagens e do texto é sempre o link curto. |
| RN-250 | 5 convites por conta, para sempre; o vencido e o cancelado voltam. |
| RN-251 | O convite vale 30 dias. |
| RN-252 | O convite por e-mail só vale para a conta criada com aquele e-mail; o do WhatsApp, para quem tiver o link. |
| RN-253 | Não se convida e-mail que já tem conta nem o próprio. |
| RN-254 | O prêmio sai uma vez por convite, na primeira publicação de quem foi convidado, e entra no extrato do banco. |
| RN-255 | Com os convites desligados, não se criam convites e os links não ligam contas; o prêmio de quem já aceitou continua. |
| RN-256 | O banco guarda só o hash do código do link. |
| RN-257 | Quem foi convidado ganha o presente de boas-vindas de toda conta nova, sem dias a mais. |
| RN-220 | O QR Code leva sempre ao link curto do anúncio. |
| RN-221 | QR em tinta preta sobre branco, com margem e correção de erro média. |
| RN-222 | Os quadrinhos do caderno, da seção e da pesquisa não têm QR Code. |
| RN-223 | O arquivo do QR só existe para anúncio no ar. |
| RN-210 | Só se pergunta "Fechou negócio?" sobre anúncio que já esteve no caderno e não foi removido. |
| RN-211 | Só o dono responde; a resposta fica gravada com a data e vale a última. |
| RN-212 | Responder não muda a situação do anúncio; tirar do caderno é escolha à parte. |
| RN-190 | O cartaz já vem com VENDE-SE, menos em Empregos, Serviços, Festas e Eventos, Turismo e Lazer e Música, Arte e Cultura, que vêm com CLASSIFICADOS. |
| RN-191 | A palavra escolhida vai no endereço (`?titulo=`) e não fica gravada no anúncio; valor desconhecido vale como o padrão da seção. |
| RN-192 | Voltar ao cartaz antigo em todas as seções é trocar o padrão no domínio (`tituloPadraoDoCartaz`). |

## Requisitos não funcionais

| ID | Requisito |
|---|---|
| RNF-01 | Toda consulta de anúncios do site é de uma cidade e uma seção, com índice `(cidadeCodigo, categoriaId, situacao, expiraEm)`. A página da cidade faz uma consulta limitada por seção que tem anúncio; a capa não consulta anúncios. |
| RNF-02 | Fotos entregues pelo Cloudinary com formato e qualidade automáticos. |
| RNF-03 | Funciona no celular com 16 px de margem e sem rolagem horizontal. |
| RNF-04 | Cabeçalhos de segurança (CSP, X-Frame-Options, nosniff). |
| RNF-05 | Termos de uso e privacidade publicados em `/termos`. |
| RNF-06 | As funções do site rodam na mesma região do banco (São Paulo, `gru1`), para cada consulta não atravessar o continente (ADR-19). |
