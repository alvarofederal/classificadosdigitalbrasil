# 017 · Banco de dias

*Ideia do Álvaro nas respostas da feature 015 (2026-11-15); decisões registradas em `features/015-convites-de-cortesia/spec.md`. Implementação autorizada por ele no mesmo dia ("Pode começar").*

## Spec

**Problema.** Hoje cada anúncio é pago na hora, por Pix, e o tempo no ar só existe preso a um anúncio. Não há onde guardar um presente (os dois anúncios de boas-vindas), o prêmio de um convite (feature 015) nem dias comprados de uma vez para usar depois. A tabela de 2026-11-09 também cobra os períodos maiores muito acima de somar semanas (30 dias sem foto por R$ 25,00, quando quatro semanas saem por R$ 4,00).

**Ideia do Álvaro.** "Quando se paga ou ganha um anúncio, ele vai tendo um banco de anúncios e dias [...] tem que ficar bem claro, acho que pode colocar no dashboard, quando o anunciante loga. E aí ele vai anunciando e descontando do banco de anúncios e dias." Sobre a tabela: "eu pensava que você ia conseguir resolver proporcionalmente", e depois "Arranca esse 10 [...] e esse 20".

**Entregas.** Esta pasta tem duas etapas:

1. **Etapa 1 (esta entrega):** saldo e extrato, presente de boas-vindas, usar os dias para publicar, renovar e prolongar, tabela proporcional, limite de cadastros por conexão e o botão do Painel que desliga o presente.
2. **Etapa 2:** comprar dias para o banco pelo Pix, sem estar preso a um anúncio, e o administrador dar dias pelo Painel. Pede mudar o pagamento para existir sem anúncio; fica separada para não mexer no caminho do dinheiro junto com o resto.

### Requisitos

| ID | Requisito |
|---|---|
| RF-170 | Minha conta mostra no alto o saldo do banco: dias sem foto e dias com foto. |
| RF-171 | A página Banco de dias, em Minha conta, lista o saldo e cada entrada e saída, com data, tipo de dia, quantidade, motivo e o anúncio, quando houver. |
| RF-172 | Ao criar o anúncio, quem tem saldo escolhe pagar com Pix ou usar dias do banco, e quantos dias usar. |
| RF-173 | No anúncio vencido, no ar ou desativado, a mesma escolha vale para renovar ou prolongar. |
| RF-174 | Painel → Configurações liga e desliga o presente de boas-vindas. |
| RF-175 | Painel → Usuários mostra o saldo de cada conta. |

### Regras

| ID | Regra |
|---|---|
| RN-170 | O banco guarda dias de dois tipos: sem foto (plano Simples) e com foto (plano Com foto). |
| RN-171 | Usar dias do banco publica ou prolonga o anúncio no plano do tipo de dia usado. Anúncio Com foto ainda em prazo só recebe dias com foto, para não perder as fotos no meio do prazo. |
| RN-172 | Publicar anúncio novo ou renovar anúncio vencido usa no mínimo 7 dias. Prolongar anúncio ainda em prazo (no ar ou desativado) aceita a partir de 1 dia, para aproveitar sobras. |
| RN-173 | Nunca se usa mais do que o saldo. O desconto é uma atualização condicionada ao saldo; se a publicação falhar depois do desconto, os dias voltam ao banco, com o registro da devolução. |
| RN-174 | Presente de boas-vindas: 7 dias sem foto e 7 dias com foto, uma vez por conta, quando o e-mail é confirmado (feature 016). Não ganham: administrador, conta desativada e e-mail de teste (RN-122). Com o presente desligado no Painel, a conta confirmada nesse período não recebe depois. |
| RN-175 | As contas de anunciante que já existiam em 2026-11-15, ativas e sem e-mail de teste, recebem o presente na migration. |
| RN-176 | No máximo 5 contas novas pela mesma conexão em 24 horas. O endereço de conexão do cadastro fica guardado, como pede o Marco Civil da Internet para registros de acesso. |
| RN-177 | Os dias do banco não vencem. |
| RN-178 | Toda entrada e saída fica no extrato: presente, uso, devolução e, nas próximas entregas, convite, compra e cortesia. |
| RN-179 | Cobrança Pix em aberto do anúncio é cancelada ao usar dias do banco; se o Pix já foi pago, o uso é recusado (como a cortesia, RN-87 e RN-88). |
| RN-180 | Tabela proporcional: em todo período, o dia custa o mesmo que no de 7 dias. Ficam à venda 7, 15 e 30 dias: sem foto R$ 1,00, R$ 2,14 e R$ 4,29; com foto R$ 10,00, R$ 21,43 e R$ 42,86. Os valores continuam editáveis em Painel → Planos. |
| RN-181 | O uso do banco aparece na lista de pagamentos do anúncio como "Dias do banco", com valor zero. |

### Critérios de aceite

- Conta nova confirma o e-mail e vê, no alto de Minha conta, 7 dias sem foto e 7 com foto.
- Criar um anúncio Com foto usando 7 dias do banco põe o anúncio no ar por 7 dias, sem Pix, e o saldo com foto vai a zero.
- Anúncio vencido renova com dias do banco; anúncio no ar prolonga com 3 dias de sobra.
- Anúncio Com foto no ar recusa dias sem foto.
- Desligado o presente no Painel, conta nova confirmada não ganha nada.
- A sexta conta pela mesma conexão no mesmo dia é recusada.
- A tela de plano mostra só 7, 15 e 30 dias, com os valores proporcionais.

## Plano

**Domínio** (`src/domain/banco/banco-de-dias.ts`): tipos de dia (os códigos SIMPLES e FOTOS), presente, mínimo para publicar, regras de uso (RN-171, RN-172), motivos do extrato e o preço proporcional (RN-180). `PERIODOS` passa a `[7, 15, 30]` e a tabela inicial do domínio, aos valores proporcionais.

**Aplicação.**

- Porta `BancoDeDiasRepository`: saldo, creditar, debitar (condicionado ao saldo) e dar o presente (condicionado a não ter recebido), cada um com o registro no extrato na mesma transação.
- `publicarSemCobranca` em `pagamentos.ts`: cancela a cobrança em aberto (RN-179), grava um pagamento de valor zero e confirma pelo caminho de sempre (`ConfirmarPagamentoUseCase`). A cortesia do Painel (RF-84) passa a usar a mesma função, com origem `CORTESIA`; o banco usa a origem `BANCO`.
- `UsarDiasDoBancoUseCase`: confere dono, regras, saldo; debita; publica; devolve se a publicação falhar.
- `DarPresenteDeBoasVindasUseCase`, chamado por `ConfirmarEmailUseCase` e por `CriarNovaSenhaUseCase` (que também confirma o e-mail, RN-157).
- `CriarAnuncioUseCase` ganha a forma de pagamento (`PIX` ou `BANCO`); `CadastrarAnuncianteUseCase` recebe o endereço de conexão e aplica a RN-176.
- `ConfiguracaoRepository` ganha o presente ligado ou desligado.

**Banco** (migration `20261116000000_banco_de_dias`):

- `usuarios`: `bancoDiasSimples`, `bancoDiasFotos` (inteiros, zero), `presenteEm` (quando recebeu o presente) e `ipDoCadastro`, com índice `(ipDoCadastro, criadoEm)`.
- `movimentos_do_banco`: `usuarioId`, `planoCodigo`, `dias` (positivo entra, negativo sai), `motivo`, `anuncioId`, `pagamentoId`, `criadoEm`; índice `(usuarioId, criadoEm)`.
- `configuracoes.presenteLigado` (verdadeiro).
- Presente para as contas existentes (RN-175) e a tabela proporcional (RN-180): apaga os preços de 10 e 20 dias e atualiza os de 15 e 30 de Simples e Com foto.

**Observação de 2026-11-16.** Em Painel → Usuários, quem usou dias do banco aparece como "pago, R$ 0,00", como já acontecia com a cortesia. Separar pagamento de verdade de uso do banco e de cortesia nessa lista fica para a etapa 2.

**ADR-21** em `02-plan.md`: saldo guardado na conta com extrato, uso pelo mesmo caminho da confirmação do pagamento, devolução em vez de transação longa, e a etapa 2 separada.

**Apresentação.** Caixa do saldo no alto de Minha conta; página `/minha-conta/banco` com o extrato; link "Banco de dias" no menu; `EscolhaDePlano` com a escolha entre Pix e dias do banco no anúncio novo e na renovação; Painel → Configurações com o botão do presente; Painel → Usuários com o saldo.

## Tarefas

- [x] T-210 Domínio do banco, tabela proporcional e testes (RN-170 a RN-172, RN-180) *(`src/domain/banco/banco-de-dias.ts`; `PERIODOS` passou a 7, 15 e 30; os testes antigos de 10 dias passaram a 15)*
- [x] T-211 Porta, casos de uso (usar, presente, criar com banco, limite por conexão) e testes (RN-173 a RN-179, RN-181) *(`tests/unit/banco-de-dias.test.ts`, 17 testes; a cortesia do Painel passou a usar `publicarSemCobranca`)*
- [x] T-212 Migration, repositórios e consultas (RN-175, RN-180) *(migration `20261116000000_banco_de_dias`, conferida num MariaDB local: das contas de teste, só a de anunciante ativa, confirmada e com e-mail comum ganhou o presente; administrador, conta desativada, conta sem confirmar e e-mails `.test` ficaram de fora; os preços de 15 e 30 dias ficaram proporcionais e os de 10 e 20 saíram. As datas da migration usam `UTC_TIMESTAMP(3)`, como o Prisma)*
- [x] T-213 Telas: saldo, extrato, escolha Pix ou banco, Painel (RF-170 a RF-175)
- [x] T-214 Testes, typecheck, build e telas num banco local *(2026-11-16: 291 testes, typecheck e build passando. No `next dev` com MariaDB local: conta nova confirmada ganhou 7 + 7 dias; o anúncio novo abriu já em "Usar dias do banco" e foi ao ar com 7 dias com foto, sem Pix; o anúncio Com foto no ar recusou dias sem foto, com o aviso na tela; um anúncio criado com Pix (tabela com 7, 15 e 30 dias) foi ao ar com os 7 dias sem foto e a cobrança Pix ficou cancelada; o extrato listou presente e usos; o Painel mostrou a coluna Banco e o botão desligou o presente. Sem erro no console nem no servidor)*
- [ ] T-215 Publicar com o OK do Álvaro
- [ ] T-216 Etapa 2: comprar dias pelo Pix e dar dias pelo Painel
