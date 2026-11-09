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
| T-14 | Teste ponta a ponta no navegador | — | Parcial: site público, página do anúncio, cartaz, link curto e webhook conferidos em produção (2026-11-09); falta o fluxo com Pix real |
| T-15 | Visual da página impressa de referência: página branca, 5 colunas densas, tarjas nas colunas, capa e cidade como página inteira, fontes carregando | RF-04, RF-05, 04-design-system | Feito |

## Versão 0.2 (2026-11-09) — detalhes em `spec/features/`

| # | Funcionalidade | Situação |
|---|---|---|
| 002 | Capa organizada: busca, perto de mim, vitrine, como funciona, valores, contato | Feito |
| 003 | Planos Simples/Com fotos/Destaque/Vitrine, 7 ou 30 dias, Painel → Planos | Feito |
| 004 | Contato com protocolo e Painel → Chamados | Feito |
| 005 | Página do anúncio para divulgar: link curto, prévia de recorte, botões, cartaz com QR, visitas | Feito |
| 006 | Pix automático (Mercado Pago + webhook) com reserva no Pix estático; na API de Orders desde 2026-11-09 (ADR-14) | Feito no código; aplicação, produção e webhook criados no Mercado Pago; **liga quando o Álvaro cadastrar as credenciais na Vercel** |
| 007 | Gol no plano Vitrine por 30 dias (cortesia) e 18 exemplos em Brasília | Feito; **faltam as fotos do Gol** |
| 008 | Teste de carga com k6 | Script pronto; falta rodar num ambiente de teste |
| 009 | Preço por período (7, 10, 15, 20, 30 dias): Simples R$ 1 a R$ 25, Com foto R$ 10 a R$ 250; Destaque e Vitrine fora de venda | Feito |

Correção na 0.2: o endereço do site passou a vir do domínio de produção da Vercel; a `NEXT_PUBLIC_URL` copiada do Pague Dez mandava link curto, QR e prévia para `paguedez.vercel.app`.

## Continuidade

Onde o trabalho está. Atualizar ao parar com algo pela metade (Art. 7 da constituição).

**Situação em 2026-11-09**

- Último commit de código: `5122172` (ADR-14), no `main` e no GitHub.
- Em andamento: 006 Pix automático. Falta confirmar o passo 5, credenciais na Vercel (ver *Onde parou* em `features/006-pix-automatico/spec.md`).
- Pendências abertas: T-84 (credenciais e Pix real de R$ 1,00), T-86 (cancelar a ordem no Mercado Pago), T-14 (fluxo com Pix real), fotos do Gol (007), rodar o k6 (008).

**Conversas perdidas em 2026-11-09**

Os arquivos das conversas de duas sessões sumiram do disco: "Classificados Digital" (última atividade às 16:01) e "Classificados Digital · continuação" (última atividade registrada às 18:30). Código e specs não foram afetados. O que foi combinado só nessas conversas e não está em `spec/` precisa ser informado de novo. Causa não identificada; as duas rodavam dentro de `.claude/worktrees`.

Proteção adotada: a tarefa agendada do Windows *Backup conversas Claude* copia as conversas a cada 15 minutos para `%USERPROFILE%\Backup-Claude`. Ela nunca apaga o que já copiou. Fica no mesmo disco, então não cobre falha do disco.

## Próximas versões

Ver `07-insights.md`: créditos (carteira), e-mail de aviso de vencimento e de nova mensagem, subir para o topo.
