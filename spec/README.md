# spec/

Documentação spec-driven (SDD) do Classificados Digitais do Brasil.

## Como trabalhamos (Spec-Driven Development)

Toda funcionalidade nova passa por quatro etapas, nesta ordem, e nada vai para o código sem a spec:

1. **Especificar** — `spec/features/NNN-nome/spec.md`: o problema, quem usa, requisitos (RF), regras (RN) e critérios de aceite. Sem tecnologia.
2. **Planejar** — mesma pasta, seção *Plano*: como fazer, em que camadas, que tabelas mudam, ADRs novos.
3. **Quebrar em tarefas** — seção *Tarefas*: passos pequenos, cada um ligado a um RF/RN.
4. **Implementar e verificar** — código, testes ligados aos RF/RN, e a spec atualizada com o que foi feito de fato.

Os documentos gerais (`00` a `07`) são a fonte da verdade do sistema inteiro; as pastas de `features/` contam a história de cada entrega.

## Documentos gerais

| Arquivo | Conteúdo |
|---|---|
| `00-constitution.md` | Princípios: camadas, SOLID, regras de negócio, LGPD |
| `01-spec.md` | Requisitos funcionais (RF), regras de negócio (RN) e não funcionais (RNF) |
| `02-plan.md` | Stack, camadas e decisões de arquitetura (ADR) |
| `03-data-model.md` | Tabelas, índices e ciclo de vida do anúncio |
| `04-design-system.md` | Página branca, tinta, fontes e peças do jornal |
| `05-tasks.md` | Quadro geral: o que foi feito e o que está pendente |
| `06-test-plan.md` | Testes automáticos, roteiro manual e teste de carga |
| `07-insights.md` | Decisões de produto, ideia original e próximos passos |

## Funcionalidades

| Pasta | Assunto | Situação |
|---|---|---|
| `features/001-versao-inicial` | Caderno, anunciante, painel, Pix estático | Entregue (2026-11-08) |
| `features/002-capa-organizada` | Capa com como funciona, valores, contato e localização | Entregue (2026-11-09) |
| `features/003-planos-e-precos` | Planos, tabela de preços editável, ordem por plano | Entregue (2026-11-09) |
| `features/004-contato-e-chamados` | Formulário de contato e chamados no painel | Entregue (2026-11-09) |
| `features/005-pagina-de-divulgacao` | Página individual do anúncio para divulgar | Entregue (2026-11-09) |
| `features/006-pix-automatico` | Confirmação automática do Pix por gateway | Entregue; liga com as credenciais do Mercado Pago |
| `features/007-dados-de-exemplo` | Anúncio do Gol e exemplos em Brasília | Entregue; faltam as fotos do Gol |
| `features/008-teste-de-carga` | Teste de carga com k6 | Anotado, script pronto |
| `features/009-tabela-de-precos` | Simples e com foto em 7, 10, 15, 20 e 30 dias | Entregue (2026-11-09) |
