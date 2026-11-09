# 03 · Modelo de dados

MySQL com `relationMode = "prisma"` (sem chaves estrangeiras físicas; todo campo de relação tem índice). Fonte da verdade: `prisma/schema.prisma`. Migração inicial: `prisma/migrations/20261108000000_inicial`.

| Tabela | Para quê | Campos principais |
|---|---|---|
| `usuarios` | Anunciantes e administradores | nome, cpf (único), email (único), celular, uf, cidadeCodigo (IBGE), senhaHash, perfil, ativo, deveTrocarSenha, aceitouTermosEm |
| `sessoes` | Login | tokenHash (SHA-256, único), expiraEm |
| `tentativas_login` | Freio contra força bruta | email, ip, sucesso, criadoEm |
| `categorias` | Seções do caderno | nome, slug (único), ordem, ativa |
| `anuncios` | O quadrado | codigo (6, único), categoriaId, uf, cidadeCodigo, titulo (40), texto, preco, moldura, estiloTitulo, alinhamento, estrelas, situacao, publicadoEm, expiraEm |
| `fotos_anuncio` | Álbum (até 6) | url, publicId (Cloudinary), ordem |
| `mensagens` | Contato do visitante | nome, contato, texto, lida |
| `pagamentos` | Cobrança do espaço | codigo (10, único, vai no Pix), planoCodigo, valor, dias, situacao (PENDENTE, CONFIRMADO, CANCELADO), gateway (MERCADO_PAGO, CORTESIA ou nulo = Pix estático), gatewayId, copiaECola, vencimentoEm, confirmadoEm, confirmadoPorId (nulo quando confirmado pelo gateway) |
| `planos` | Planos (feature 003) | codigo (SIMPLES, FOTOS, DESTAQUE, VITRINE), nome, descricao, maxFotos, ativo |
| `precos` | Preço por plano e período (feature 009) | planoCodigo + dias (7, 10, 15, 20, 30) como chave, valor |
| `chamados` | Contato com o admin (feature 004) | protocolo (8, único), nome, email, telefone, assunto, mensagem, anuncioCodigo, situacao (ABERTO, RESOLVIDO), notaInterna, resolvidoEm |
| `configuracoes` | Linha única `geral` | pixChave, pixNome, pixCidade (Pix estático de reserva) |

`anuncios` ganhou na migração `20261109000000_planos_chamados_gateway`: `planoCodigo`, `prioridade` (0 a 3, RN-50) e `visualizacoes` (RF-75). `configuracoes` perdeu `valorAnuncio` e `diasDePublicacao` (viraram a tabela `planos`).

## Índices que importam

- `anuncios (cidadeCodigo, categoriaId, situacao, expiraEm)`: a lista pública e a contagem por seção (RNF-01).
- `anuncios (uf, cidadeCodigo)` e `anuncios (criadoEm)`: filtros do painel.
- `pagamentos (anuncioId, situacao)`: cobrança pendente do anúncio.
- `anuncios (planoCodigo, situacao, expiraEm)`: vitrine da capa.
- `pagamentos (gatewayId)`: aviso do gateway.

## Situação do anúncio

`AGUARDANDO_PAGAMENTO` → (Pix confirmado) → `PUBLICADO` → (data passa) expirado, sem mudar a coluna → (Pix confirmado) volta ao ar. `REMOVIDO` a qualquer momento; só o admin restaura.
