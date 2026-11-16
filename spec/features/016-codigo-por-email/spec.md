# 016 · Código por e-mail

*Pedida pelo Álvaro em 2026-11-15, nas respostas da feature 015. Implementação autorizada por ele no mesmo dia ("o que tiver que implementar, pode implementar").*

## Spec

**Problema.** Hoje qualquer pessoa cria uma conta com um e-mail que não é dela, e o CPF só é conferido pela conta dos dígitos. Com o presente de boas-vindas (feature 017) e os convites (015), conta falsa passa a render anúncio de graça. Também não existe "esqueci a senha": quem perde a senha fica sem a conta.

**Pedido do Álvaro.** "Quando um usuário novo fizer uma conta, tem que mandar um código para o e-mail dele e ele copia e cola esse número ou escreve no sistema, e aí sim a conta dele vai ser liberada, por questão de segurança [...] Tudo que a gente puder colocar para melhorar a segurança de quem vai usar com seriedade, vamos implementar. Pois vamos mexer com dinheiro."

### Requisitos

| ID | Requisito |
|---|---|
| RF-150 | Ao criar a conta, o site manda ao e-mail informado um código de 6 números. A conta só é liberada depois que a pessoa digita o código na tela "Confirme seu e-mail". |
| RF-151 | Enquanto o e-mail não é confirmado, quem entra na conta cai na tela de confirmação: não vê Minha conta, não cria nem paga anúncio. |
| RF-152 | Na tela de confirmação a pessoa pode pedir outro código e corrigir o e-mail, se digitou errado; o código novo vai para o e-mail corrigido. |
| RF-153 | "Esqueci a senha" no Entrar: a pessoa informa o e-mail, recebe um código e cria uma senha nova. A conta entra logada e todas as outras sessões dela caem. |
| RF-154 | Em Meus dados, o e-mail novo só passa a valer depois que a pessoa digita o código mandado para ele. Até lá, continua valendo o antigo, e a troca pode ser cancelada. |
| RF-155 | Quando o e-mail é trocado, o endereço antigo recebe um aviso de que a troca aconteceu. |
| RF-156 | O Painel mostra, na lista de usuários, quem ainda não confirmou o e-mail. |

### Regras

| ID | Regra |
|---|---|
| RN-150 | O código tem 6 números aleatórios e vale 15 minutos. O banco guarda só o hash (SHA-256) do código. |
| RN-151 | Cada código aceita no máximo 5 tentativas erradas; depois disso, só pedindo outro. |
| RN-152 | Um código novo só sai 60 segundos depois do anterior, e no máximo 5 por hora para a mesma conta e a mesma finalidade. Pedir outro invalida o anterior. |
| RN-153 | Cada código serve a uma finalidade (confirmar o cadastro, trocar o e-mail, criar senha nova) e a um uso só. |
| RN-154 | As contas que existiam antes desta funcionalidade contam como confirmadas. Administrador criado pelo seed também. |
| RN-155 | Para "um e-mail por conta" (RN-01), o que vem depois do `+` não conta, em qualquer domínio, e no Gmail os pontos também não: `fulano+x@gmail.com` e `f.ulano@gmail.com` são o mesmo e-mail que `fulano@gmail.com`. |
| RN-156 | "Esqueci a senha" responde a mesma coisa exista ou não a conta, para não revelar quem tem cadastro; o código só sai para conta ativa. |
| RN-157 | Criar a senha nova pelo código também confirma o e-mail, porque a pessoa provou que lê aquela caixa. |
| RN-158 | Sem servidor de e-mail, o código não sai: a tela avisa que não foi possível enviar e a conta continua aguardando. Fora da produção, o código aparece no terminal do servidor. |
| RN-159 | O e-mail com o código só leva o primeiro nome, diz para que serve o código e lembra que o site nunca pede o código por telefone ou mensagem. |

### Critérios de aceite

- Conta nova recebe o código, digita e cai em "Novo anúncio" (ou onde estava indo).
- Código errado cinco vezes bloqueia o código; código vencido é recusado; pedir outro antes de 60 segundos é recusado com o tempo que falta.
- Quem fecha a página antes de confirmar, ao entrar de novo, volta para a tela do código.
- `fulano+1@gmail.com` não cria conta se `fulano@gmail.com` já existe.
- "Esqueci a senha" com e-mail que não existe responde igual e não manda nada.
- Trocar o e-mail em Meus dados não muda nada até o código; depois do código, o e-mail antigo recebe o aviso.

## Plano

**Camadas.**

- `domain/usuario/codigo-por-email.ts`: constantes (RN-150 a RN-152), `emailCanonico` (RN-155), `normalizarCodigo` e as cartas do código e do aviso de troca (RN-159). Puro, sem crypto: o código vem da porta `GeradorDeCodigo`.
- `application/ports/acesso.ts`: `UsuarioRegistro.emailConfirmadoEm`, `UsuarioDaSessao.emailConfirmado`, `UsuarioRepository.confirmarEmail` e a porta nova `CodigoPorEmailRepository`.
- `application/use-cases/acesso/codigo-por-email.ts`: `emitirCodigo` e `conferirCodigo` (função comum às três finalidades) e os casos de uso `ConfirmarEmailUseCase`, `ReenviarCodigoUseCase`, `CorrigirEmailDoCadastroUseCase`, `PedirNovaSenhaUseCase`, `CriarNovaSenhaUseCase`, `PedirTrocaDeEmailUseCase`, `ConfirmarTrocaDeEmailUseCase`, `CancelarTrocaDeEmailUseCase`. `CadastrarAnuncianteUseCase` passa a criar a conta sem confirmação e emitir o código; `AtualizarPerfilUseCase` deixa de mudar o e-mail (vai para a troca com código).
- `infrastructure/prisma`: tabela nova e o e-mail canônico calculado no repositório, ao gravar.
- Apresentação: páginas `/confirmar-email` e `/esqueci-a-senha` no grupo `(acesso)`; `exigirPerfil` e `autorizar` barram conta sem confirmação; Entrar ganha o link "Esqueci a senha"; Meus dados ganha a caixa do e-mail novo pendente; Painel → Usuários ganha a marca "e-mail não confirmado".

**Banco** (migration `20261115220000_codigo_por_email`):

- `usuarios`: `emailConfirmadoEm` (nulo = aguardando) e `emailCanonico` (com índice, sem `UNIQUE` para a migration nunca falhar por um par antigo repetido; a regra fica no caso de uso). A migration preenche os dois para as contas existentes (RN-154, RN-155).
- `codigos_por_email`: `usuarioId`, `finalidade` (`CADASTRO`, `TROCA_DE_EMAIL`, `NOVA_SENHA`), `email` (para onde foi), `codigoHash`, `tentativas`, `expiraEm`, `usadoEm`, `criadoEm`; índice `(usuarioId, finalidade, criadoEm)`.

**ADR-20** em `02-plan.md`: código por e-mail em tabela própria, hash do código, limites e o correio no terminal fora da produção.

**Fora desta entrega.** Limite de cadastros por conexão e o botão do Painel que desliga o presente: entram na 017, junto com o presente que motiva o abuso. Conferir o CPF na Receita (serviço pago) fica para depois. Código por WhatsApp: as variáveis `TWILIO_*` existem na Vercel, copiadas de outro projeto, mas não há conferência de que funcionam; fica para depois.

## Tarefas

- [x] T-200 Domínio: e-mail canônico, código e cartas (RN-150 a RN-153, RN-155, RN-159), com testes *(`src/domain/usuario/codigo-por-email.ts`; a carta ganhou o campo `destaque`, o código em letra grande)*
- [x] T-201 Portas, casos de uso e falsos dos testes (RF-150 a RF-155, RN-151 a RN-158), com testes *(`tests/unit/codigo-por-email.test.ts`, 24 testes; o cadastro em `casos-de-uso.test.ts` passou a conferir a conta aguardando o código)*
- [x] T-202 Prisma: schema, migration com o preenchimento das contas antigas, repositórios (RN-154) *(migration `20261115220000_codigo_por_email`; o SQL do e-mail canônico foi conferido contra a função do domínio com cinco endereços num MariaDB local, com o mesmo resultado)*
- [x] T-203 Telas: confirmar e-mail, esqueci a senha, Meus dados, barreira na sessão, Painel (RF-150 a RF-156) *(em Meus dados o e-mail saiu do formulário dos dados e ganhou a caixa própria, com o código)*
- [x] T-204 Correio no terminal fora da produção (RN-158) e seed do admin confirmado
- [x] T-205 Testes, typecheck, build e telas num banco local *(2026-11-15: 267 testes, typecheck e build passando. No `next dev` com um MariaDB local, conferidos: cadastro levando à tela do código, Minha conta barrada antes do código, código errado com "Restam 4 tentativas", código certo liberando a conta, troca de e-mail com código e o aviso ao endereço antigo, saída, "Esqueci a senha" com código e senha nova entrando em Minha conta. Sem erro no console nem no servidor. Não conferido na tela: a marca do Painel, que pede entrar como administrador)*
- [x] T-206 Publicar com o OK do Álvaro *(2026-11-15, 22:40: push de `f276219` a `a0f41c9` com o "Pode publicar" dele; o deploy aplicou a migration `20261115220000_codigo_por_email`. Conferido no ar: Entrar com o link "Esqueci a senha", as páginas `/esqueci-a-senha` e `/cadastro`, `/confirmar-email` e Minha conta mandando para o Entrar quem não está logado, e as páginas públicas)*
- [ ] T-207 Conferir em produção com uma conta nova de teste: o Álvaro cria a conta com outro e-mail dele e vê o código chegar

**Achado ao testar.** Num banco novo, o seed falha ao criar os planos: a migration `20261109120000_precos_por_periodo` grava os preços de SIMPLES e FOTOS mesmo sem os planos existirem, e o seed tenta criar de novo. Não afeta a produção (os planos já existem lá). Anotado como item 8.10 do `08-lancamento.md`.
