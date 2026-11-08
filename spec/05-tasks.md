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
| T-13 | Banco da Hostinger acessível pela Vercel e primeiro deploy | — | **Bloqueado**: o banco recusa a conexão (senha ou acesso remoto) |
| T-14 | Teste ponta a ponta no navegador | — | Pendente (depende da T-13) |

## Próximas versões

Ver `07-insights.md`: gateway Pix com webhook, créditos, e-mail de aviso de vencimento, destaque pago.
