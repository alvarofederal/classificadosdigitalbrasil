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

## Requisitos não funcionais

| ID | Requisito |
|---|---|
| RNF-01 | Toda consulta de anúncios do site é de uma cidade e uma seção, com índice `(cidadeCodigo, categoriaId, situacao, expiraEm)`. A página da cidade faz uma consulta limitada por seção que tem anúncio; a capa não consulta anúncios. |
| RNF-02 | Fotos entregues pelo Cloudinary com formato e qualidade automáticos. |
| RNF-03 | Funciona no celular com 16 px de margem e sem rolagem horizontal. |
| RNF-04 | Cabeçalhos de segurança (CSP, X-Frame-Options, nosniff). |
| RNF-05 | Termos de uso e privacidade publicados em `/termos`. |
