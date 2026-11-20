# 024 · Cadastro sem confirmação: continuar ou desistir

*Pedido do Álvaro em 2026-11-19, com as decisões dadas no mesmo dia.*

## Spec

**Problema.** Desde a feature 016, a conta nova só é liberada depois que a pessoa digita o código mandado ao e-mail. Quem não digita fica com a conta parada, marcada "e-mail não confirmado" em Painel → Usuários, e essas contas se acumulam no banco sem ninguém falar com elas.

**Pedido.** "Tem que criar um botão para mim, para que, quando um novo usuário se cadastrar, eu possa mandar uma mensagem para o email dele, para que ele possa dar continuidade ou desistir da conta. Se der continuidade, ele valida para fazer anúncios, se desistir, é bom que apaga para não ficar juntando lixo no banco. E colocar uma funcionalidade de lembrete para mim, de forma visual mesmo."

**Decisões do Álvaro (perguntas com opções).**

- O botão vale **só para quem não confirmou o e-mail**.
- Sem resposta, a conta **é apagada sozinha 7 dias** depois do e-mail.
- O lembrete aparece **nos três lugares**: quadro no Resumo do Painel, número no menu do Painel e número no link "Painel" do alto do site.

| ID | Requisito |
|---|---|
| RF-240 | No Painel, cada conta de anunciante que não confirmou o e-mail tem o botão "Mandar e-mail: continuar ou desistir". O e-mail vai para o endereço da conta e traz os dois caminhos e o prazo. |
| RF-241 | "Continuar" abre uma página do site com o botão "Continuar com a minha conta". O clique confirma o e-mail (vale como o código da 016), dá o presente de boas-vindas (017) e leva a pessoa a entrar para anunciar. |
| RF-242 | "Desistir" abre a mesma página com o botão "Apagar minha conta". O clique apaga a conta na hora. |
| RF-243 | Sem resposta em 7 dias depois do e-mail, a rodada diária apaga a conta. |
| RF-244 | O Resumo do Painel abre com um quadro dos cadastros esperando contato, cada um com o botão do e-mail, e dos que aguardam resposta, com a data em que serão apagados. |
| RF-245 | Enquanto houver cadastro esperando contato, o menu do Painel mostra o número ao lado de "Usuários", e o alto do site, para o administrador, ao lado de "Painel". |
| RF-246 | Em Painel → Usuários, a conta sem confirmação mostra se o e-mail já foi mandado e quando ela será apagada; o botão permite mandar de novo. |

| ID | Regra |
|---|---|
| RN-240 | Espera contato a conta de anunciante sem e-mail confirmado, criada há mais de 1 hora, que ainda não recebeu este e-mail. A hora dá tempo de a pessoa digitar o código. |
| RN-241 | O link do e-mail leva um código aleatório; o banco guarda só o hash (SHA-256), como na sessão. Mandar de novo troca o código (o link anterior deixa de valer) e recomeça o prazo. |
| RN-242 | Abrir o link não muda nada: a escolha só vale com o clique no botão da página, porque programas de e-mail e antivírus abrem links sozinhos. |
| RN-243 | Só se apaga conta de anunciante sem e-mail confirmado, sem anúncio e sem pagamento. A conta que confirmou pelo código nesse meio tempo não é apagada, nem pela pessoa nem pela rodada. |
| RN-244 | Apagar a conta leva junto as sessões, os códigos por e-mail e o extrato do banco de dias; um convite que ela aceitou fica sem conta ligada. |
| RN-245 | O prazo é de 7 dias depois do último e-mail, e a carta diz a data. |
| RN-246 | Corrigir o e-mail na tela do código invalida o link mandado ao endereço antigo; a conta volta a esperar contato. |
| RN-247 | Sem servidor de e-mail, ou com falha no envio, o botão avisa que não foi possível mandar e nada fica registrado. |
| RN-248 | A carta leva só o primeiro nome, a data do cadastro, os dois caminhos e o prazo, sem slogan. |

**Critérios de aceite.**

- Conta sem confirmação há mais de 1 hora aparece no quadro do Resumo e soma no número do menu e do alto do site.
- Mandar o e-mail tira a conta do "esperando contato" e mostra "apaga em DD/MM".
- O link de continuar, com o clique no botão, libera a conta e dá o presente; o de desistir, com o clique, apaga a conta.
- Link de outro envio, de conta já apagada ou de conta corrigida para outro e-mail diz que o link não vale mais.
- Sete dias depois do e-mail, sem resposta, a rodada diária apaga a conta; a que confirmou fica.

## Plano

- **Domínio** `src/domain/usuario/cadastro-sem-confirmacao.ts`: a espera de 1 hora e o prazo de 7 dias (RN-240, RN-245), `prazoParaApagar`, `esperaContato` e a carta (RN-248). Puro.
- **Porta** `CadastroSemConfirmacaoRepository` em `application/ports/acesso.ts` (Art. 2, I: porta pequena): listar os pendentes, contar os que esperam contato, registrar e limpar o contato, buscar pelo hash do link, apagar com as condições da RN-243 e listar os sem resposta.
- **Casos de uso** `application/use-cases/acesso/cadastro-sem-confirmacao.ts`: `MandarContinuarOuDesistirUseCase`, `ContinuarOuDesistirUseCase` (ver, continuar e desistir) e `ApagarCadastrosSemRespostaUseCase`. `CorrigirEmailDoCadastroUseCase` limpa o contato (RN-246). O presente sai pela mesma porta da confirmação pelo código.
- **Banco** (migration `20261120000000_continuar_ou_desistir`): `usuarios.contatoEnviadoEm` e `usuarios.contatoHash` (único), índice `(emailConfirmadoEm, contatoEnviadoEm)`. Colunas no usuário, e não tabela nova: é um contato por conta, e o lembrete conta direto em `usuarios`.
- **Apagar**: `deleteMany` com as condições da RN-243 na mesma instrução, para não apagar uma conta que confirmou um instante antes. O banco usa `relationMode = "prisma"`; as ligações em cascata (sessões, códigos, extrato, convites feitos) e o convite aceito são resolvidos pelo cliente do Prisma.
- **Rodada diária**: a de `/api/tarefas/vencidos` (feature 018) ganha a parte "cadastros sem resposta", sem agendador novo.
- **Apresentação**: página `/continuar-cadastro/[codigo]` no grupo `(acesso)`, com os dois botões e `?escolha=` vindo do e-mail; quadro no Resumo do Painel; número no menu do Painel e no alto do site (só para o administrador); situação e botão em Painel → Usuários.
- **ADR-25** em `02-plan.md`.

## Tarefas

- [x] T-290 Domínio: espera, prazo e carta, com testes (RN-240, RN-245, RN-248) *(`src/domain/usuario/cadastro-sem-confirmacao.ts`; a carta ganhou o campo opcional `segundoBotao`, desenhado só com o contorno abaixo do botão principal, no HTML e no texto puro)*
- [x] T-291 Porta, casos de uso e falsos, com testes (RF-240 a RF-243, RN-241 a RN-247) *(`tests/unit/continuar-ou-desistir.test.ts`, 16 testes)*
- [x] T-292 Banco: colunas, migration e repositório (RN-241, RN-243, RN-244) *(migration `20261120000000_continuar_ou_desistir`, gerada com `prisma migrate diff` e aplicada no banco local)*
- [x] T-293 Página do link com os dois botões (RF-241, RF-242, RN-242) *(a escolha que veio do e-mail aparece primeiro; apagar pede a confirmação do navegador)*
- [x] T-294 Painel: quadro no Resumo, número no menu, situação e botão em Usuários (RF-240, RF-244 a RF-246)
- [x] T-295 Número no alto do site para o administrador (RF-245)
- [x] T-296 Rodada diária apaga os sem resposta (RF-243) *(nova parte da rodada de `/api/tarefas/vencidos`, sem agendador novo)*
- [x] T-297 Testes, typecheck, build e conferência num banco local *(2026-11-20: 374 testes, typecheck e `next build`. No `next dev` com o MariaDB local, com contas de teste fictícias e uma sessão de administrador criada direto no banco (sem senha), conferidos: o número 2 no alto do site e no menu, sem contar a conta de 20 minutos (RN-240); o quadro do Resumo; o envio, com a carta saindo no terminal, e o quadro passando a "e-mail mandado em 20/11/2026; apaga em 27/11/2026"; o link de desistir só mostrando a escolha e, com o clique, apagando a conta junto com a sessão e o código dela (RN-244, conferido no banco); o mesmo link depois disso com "Link sem valor"; o de continuar confirmando a conta, limpando o link e levando ao Entrar com "Conta confirmada"; a rodada diária recusando sem o segredo (401) e, com um segredo de teste só no site local, apagando só a conta sem resposta há 8 dias e deixando a que está no prazo e as confirmadas. O presente de boas-vindas não saiu para a conta de teste porque e-mail de teste não ganha presente (RN-122); com e-mail comum, ele sai, como mostram os testes. Sem erro no console nem no servidor)*
- [ ] T-298 Publicar com o OK do Álvaro e conferir no ar
