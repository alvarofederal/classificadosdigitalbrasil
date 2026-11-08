# 06 · Plano de testes

`npm test` roda os testes de unidade (Vitest), sem banco e sem rede.

## Cobertos (56 testes, todos passando em 2026-11-08)

| Arquivo | O que verifica |
|---|---|
| `tests/unit/arquitetura.test.ts` | Art. 1: domínio e aplicação não importam framework nem infraestrutura (um teste por arquivo). |
| `tests/unit/dominio.test.ts` | CPF; cadastro; normalização e validação do anúncio; situação exibida; RN-12 (soma de dias); código público; CRC16 com o valor de referência `29B1`; montagem do BR Code; formatos de chave Pix; nome sem acento; tabela de preço; mensagem; slug de categoria; UF. |
| `tests/unit/casos-de-uso.test.ts` | Anúncio nasce com cobrança de R$ 1,00/7 dias; cidade de outra UF e categoria desativada recusadas; confirmar publica por 7 dias e renovar no ar soma (2 + 7 = 9 dias); confirmação dupla recusada; uma cobrança pendente por vez; renovação alheia recusada; Pix só com recebedor configurado; edição só do dono; remover cancela pendências; só admin restaura; mensagem só no ar e com limite de 3 por contato; cadastro normaliza e recusa e-mail e CPF repetidos; categoria em uso não é excluída. |

Os casos de uso rodam contra `tests/fakes.ts` (repositórios em memória) e o catálogo real do IBGE.

## Roteiro manual (pendente: depende do banco)

1. Capa → escolher DF, Brasília, Veículos → Pesquisar → página da seção em colunas.
2. Ícone de conversa → modal → enviar mensagem → ver em Minha conta.
3. Ícone de álbum → galeria com setas e miniaturas.
4. Criar conta → Novo anúncio → mudar moldura, título, alinhamento e estrelas e ver a prévia mudar → Salvar → QR Code do Pix.
5. Subir 2 fotos, reordenar, remover uma.
6. Painel → Anúncios → filtrar por "Aguardando pagamento" → Confirmar Pix → anúncio aparece no caderno com prazo de 7 dias.
7. Painel → Usuários → filtro "Pagaram" mostra o anunciante com R$ 1,00.
8. Painel → Categorias → criar, renomear, desativar (some dos filtros), excluir vazia.
9. Celular (375 px): filtros empilhados, uma coluna, modal cabe na tela.
