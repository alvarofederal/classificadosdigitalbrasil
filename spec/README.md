# spec/

Documentação spec-driven (SDD) do Classificados Digitais do Brasil.

## Como trabalhamos (Spec-Driven Development)

Toda funcionalidade nova passa por quatro etapas, nesta ordem, e nada vai para o código sem a spec:

1. **Especificar** — `spec/features/NNN-nome/spec.md`: o problema, quem usa, requisitos (RF), regras (RN) e critérios de aceite. Sem tecnologia.
2. **Planejar** — mesma pasta, seção *Plano*: como fazer, em que camadas, que tabelas mudam, ADRs novos.
3. **Quebrar em tarefas** — seção *Tarefas*: passos pequenos, cada um ligado a um RF/RN.
4. **Implementar e verificar** — código, testes ligados aos RF/RN, e a spec atualizada com o que foi feito de fato.

Os documentos gerais (`00` a `07`) são a fonte da verdade do sistema inteiro; as pastas de `features/` contam a história de cada entrega.

## Retomar o trabalho

A memória do projeto é esta pasta, não a conversa (Art. 7 da constituição). Numa sessão nova, ler `00-constitution.md`, a seção *Continuidade* de `05-tasks.md` e a spec da funcionalidade em andamento, e conferir o `git log`.

## Documentos gerais

| Arquivo | Conteúdo |
|---|---|
| `00-constitution.md` | Princípios: camadas, SOLID, regras de negócio, LGPD |
| `01-spec.md` | Requisitos funcionais (RF), regras de negócio (RN) e não funcionais (RNF) |
| `02-plan.md` | Stack, camadas e decisões de arquitetura (ADR) |
| `03-data-model.md` | Tabelas, índices e ciclo de vida do anúncio |
| `04-design-system.md` | Página branca, tinta, fontes e peças do jornal |
| `05-tasks.md` | Quadro geral: o que foi feito, o que está pendente e onde o trabalho parou |
| `06-test-plan.md` | Testes automáticos, roteiro manual e teste de carga |
| `07-insights.md` | Decisões de produto, ideia original e próximos passos |
| `08-lancamento.md` | Checklist com caixas para marcar: liberar o site (aviso por e-mail, Pix real) e as melhorias em ordem de prioridade |

## Funcionalidades

| Pasta | Assunto | Situação |
|---|---|---|
| `features/001-versao-inicial` | Caderno, anunciante, painel, Pix estático | Entregue (2026-11-08) |
| `features/002-capa-organizada` | Capa com como funciona, valores, contato e localização | Entregue (2026-11-09) |
| `features/003-planos-e-precos` | Planos, tabela de preços editável, ordem por plano | Entregue (2026-11-09) |
| `features/004-contato-e-chamados` | Formulário de contato e chamados no painel | Entregue (2026-11-09) |
| `features/005-pagina-de-divulgacao` | Página individual do anúncio para divulgar | Entregue (2026-11-09) |
| `features/006-pix-automatico` | Confirmação automática do Pix por gateway | Entregue e funcionando: Pix real pago e confirmado sozinho em 2026-11-11; falta conferir o cancelamento (passo 8) |
| `features/007-dados-de-exemplo` | Anúncio do Gol e exemplos em Brasília | Entregue; fotos do Gol canceladas em 2026-11-11 |
| `features/008-teste-de-carga` | Teste de carga com k6 | Anotado, script pronto |
| `features/009-tabela-de-precos` | Simples e com foto em 7, 10, 15, 20 e 30 dias | Entregue (2026-11-09) |
| `features/012-aviso-de-vencimento` | E-mail "seu anúncio sai do caderno amanhã", pelo agendador diário | Feito em 2026-11-12; primeiro aviso esperado em 17/11 |
| `features/013-visitas-do-anuncio` | Visitas por pessoa, dia e cidade, sem guardar IP, na lista e na tela do anúncio | Feito em 2026-11-12 |
| `features/011-google` | Anúncios no sitemap e dados estruturados para o Google | Entregue (2026-11-12); site no Search Console com o sitemap enviado |
| `features/015-convites-de-cortesia` | Convites: 5 por conta, por e-mail ou WhatsApp; quem convida ganha 7 dias com foto quando o amigo publica | No ar desde 2026-11-16 |
| `features/016-codigo-por-email` | Código de 6 números por e-mail no cadastro, na troca de e-mail e no "esqueci a senha" | No ar desde 2026-11-15 |
| `features/017-banco-de-dias` | Banco de dias: saldo e extrato, presente de boas-vindas, usar dias para publicar e renovar, tabela proporcional | Etapa 1 no ar desde 2026-11-16; etapa 2 (compra pelo Pix) a fazer |
| `features/023-cabecalho-de-ponta-a-ponta` | DIGITAIS DO BRASIL abaixo da manchete, do C ao S, e a cidade da página na linha fina | No ar desde 2026-11-16, 21:51; manchete 25% menor desde 22:02; espaços da capa desde 22:19 |
| `features/022-qr-code-do-anuncio` | QR Code do sistema na página do anúncio, nas imagens de divulgação, no cartaz e para baixar | No ar desde 2026-11-16 |
| `features/021-fechou-negocio` | "Fechou negócio?" na tela do anúncio e no e-mail do vencimento, com os números no Painel | No ar desde 2026-11-16 |
| `features/020-kit-de-divulgacao` | Imagens para o status e para grupos, texto pronto e compartilhar com imagem, na tela do anúncio | No ar desde 2026-11-16 |
| `features/019-cartaz-vende-se` | VENDE-SE, ALUGA-SE ou CLASSIFICADOS no alto do cartaz A4 | No ar desde 2026-11-15 |
| `features/010-aviso-de-mensagem` | Aviso por e-mail ao dono quando chega mensagem | Em produção desde 2026-11-11; envio pelo Resend (T-126) conferido em produção no mesmo dia (T-125 feita) |
