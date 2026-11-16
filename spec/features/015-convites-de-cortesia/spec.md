# 015 · Convites de cortesia

*Rascunho de 2026-11-14; respostas do Álvaro em 2026-11-15, todas dadas. Próximo passo: Plano e Tarefas, começando pela 016 (código por e-mail).*

## Spec

**Problema.** O caderno de Brasília tem poucos anúncios de verdade. A cortesia hoje é manual: o administrador publica um anúncio por vez pelo Painel (RF-84), e o item 5.2 do `08-lancamento.md` prevê fazer isso com os 100 primeiros da cidade. Não existe um jeito de quem já anuncia trazer outras pessoas, e o boca a boca é a propaganda inicial do site.

**Ideia do Álvaro (2026-11-14).** "Além dos 100 primeiros, bolar um plano para quando alguém novo chegar, usando cortesia ou não, ele ganha 5 cortesias para entregar a amigos, validado pelo e-mail ou WhatsApp."

### Respostas do Álvaro (2026-11-15)

As seis perguntas do rascunho de 14/11 foram respondidas, e duas ideias novas mudaram a proposta.

1. **O que a cortesia dá:** Com foto por 7 dias. "Ele tendo a sensação que está ganhando muito, pode voltar mesmo pelo pouco. R$ 1,00 que entra, já é grana feita."
2. **Validação:** as duas formas. O convite vai por e-mail, com conferência, e também por um botão "Enviar pelo WhatsApp", sem conferência. O botão fica na tela de acompanhamento dos anúncios (Minha conta).
3. **Presente de boas-vindas (ideia nova, substitui os 100 primeiros).** "Cada usuário novo, sendo por cortesia ou não, vai ganhar dois anúncios, com 7 dias, um com foto e outro sem foto. Só isso, sem complicar."
4. **Convites:** todo anunciante tem 5 convites. Quando o amigo convidado cria a conta e publica um anúncio, com ou sem foto, quem convidou ganha mais um anúncio. O convite vale por 30 dias; se não for usado, volta para quem convidou. Sem limite por cidade; o Painel ganha um botão para desligar os convites de uma vez.
5. **Os 100 primeiros:** deixam de existir como regra própria; o presente de boas-vindas do item 3 vale para todo usuário novo, em qualquer cidade.
6. **Banco de anúncios e dias (ideia nova, o Álvaro pediu opinião).** O que se paga ou se ganha vai para um banco da conta: um anúncio Com foto de 7 dias custa R$ 10,00; R$ 5,00 compram 5 anúncios Simples, ou 35 dias. O anunciante vê o saldo assim que entra em Minha conta e vai usando: publicar um anúncio novo ou renovar um vencido desconta do banco.
7. **Vencidos, como na OLX.** O anúncio vencido fica em *Expirados* por até 180 dias, e pode ser renovado sem reescrever; depois é apagado de vez. As mensagens ficam para leitura por 90 dias depois do vencimento e depois são apagadas; renovando antes disso, o anúncio volta a receber mensagens.
8. **Segurança da conta.** "Quando um usuário novo fizer uma conta, tem que mandar um código para o e-mail dele [...] e aí sim a conta dele vai ser liberada." O CPF continua obrigatório e prende os anúncios à pessoa. "Tudo que a gente puder colocar para melhorar a segurança de quem vai usar com seriedade, vamos implementar. Pois vamos mexer com dinheiro."
9. **Cartaz VENDE-SE (item 5.4):** a pergunta não ficou clara; foi refeita com uma figura.

### Análise (Claude, 2026-11-15)

**O banco de anúncios junta tudo numa regra só.** Boas-vindas, prêmio do convite, cortesia do Painel e compra pelo Pix viram a mesma coisa: anúncios de 7 dias no saldo da conta. É o item 8.1 (créditos) do `08-lancamento.md`. Também resolve a taxa do Mercado Pago (0,99% por Pix): cinco anúncios num Pix de R$ 5,00 em vez de cinco Pix de R$ 1,00.

**Os períodos maiores perdem o sentido.** A tabela de 2026-11-09 cobra R$ 25,00 por 30 dias do Simples, mas quatro anúncios de 7 dias saem por R$ 4,00. Isso já acontece hoje com quatro renovações; o banco só torna o caminho mais fácil. Sugestão: vender só o anúncio de 7 dias (Simples R$ 1,00, Com foto R$ 10,00) e tirar 10, 15, 20 e 30 dias da venda.

**O CPF hoje só é conferido pela conta dos dígitos.** Qualquer pessoa consegue gerar um número válido. Com dois anúncios de presente por conta nova, isso abre espaço para contas falsas. Por isso entram juntos: o código por e-mail (uma caixa de e-mail de verdade por conta), o mesmo e-mail do Gmail escrito de outro jeito contando como um só (`fulano+1@gmail.com`, `f.ulano@gmail.com`), limite de cadastros por conexão e o botão do Painel para desligar presente e convites. Conferir o CPF na Receita exige serviço pago; fica para depois.

**Separação em funcionalidades.** O pedido de 15/11 passa a ser quatro entregas, nesta ordem, cada uma com a sua pasta:

| Ordem | Funcionalidade | Situação |
|---|---|---|
| 1 | 016 · Código por e-mail: no cadastro, na troca de e-mail e no "esqueci a senha" (hoje não existe) | Decidido; pode começar |
| 2 | 017 · Banco de anúncios: saldo em dias, presente de boas-vindas, compra pelo Pix, uso para publicar e renovar | Decidido em 2026-11-15 (banco em dias, preço proporcional) |
| 3 | 015 · Convites (esta pasta): 5 por conta, e-mail e WhatsApp, prêmio pelo banco | Depende da 016 e da 017 |
| 4 | 018 · Expirados por 180 dias e mensagens por 90 (regra da OLX) | Decidido; independe das outras |

O cartaz VENDE-SE (5.4) é uma mudança pequena no cartaz da feature 005; aprovado em 2026-11-15, vira a feature 019.

### Propostas que valem sem pergunta (o Álvaro pode mudar)

- As contas que já existem também ganham os 2 anúncios de presente e os 5 convites. Não ganham: administrador e contas de teste (e-mail em domínio de teste, RN-122).
- As contas que já existem contam como confirmadas; o código vale para as novas e para quem trocar de e-mail.
- O prêmio de quem convidou é um anúncio Com foto de 7 dias, como na resposta 1.
- Anúncio do banco não vence.
- Um anúncio Com foto do banco pode publicar um anúncio sem foto; o contrário não.
- Os pagamentos nunca são apagados com o anúncio vencido: são registro de dinheiro.

### Perguntas para o Álvaro (2026-11-15) e respostas

1. **Banco de anúncios:** fazer como proposto, com o anúncio de 7 dias como unidade e vários anúncios do banco podendo somar dias no mesmo anúncio (5 anúncios = 35 dias)? **Resposta:** "A grosso modo o banco vai ficar legal, aí a gente testa."
2. **Períodos maiores:** tirar 10, 15, 20 e 30 dias da venda e vender só o anúncio de 7 dias? **Resposta:** "Eu pensava que você ia conseguir resolver proporcionalmente." Decisão abaixo.
3. **Cartaz:** pôr VENDE-SE grande no alto do cartaz A4 (pergunta refeita com figura)? **Resposta:** "Ficou boa a ideia do vende-se, mas se não pegar, voltamos ao classificados no título do anúncio." Vira uma mudança pequena no cartaz (feature 019).

### Decisão: banco em dias, preço proporcional (2026-11-15)

O banco guarda **dias**, separados em sem foto e com foto, em vez de contar anúncios. Assim os períodos maiores continuam à venda sem ficarem mais caros que somar semanas:

- **O dia custa o mesmo em qualquer período**, proporcional ao preço de 7 dias (Simples R$ 1,00, Com foto R$ 10,00), arredondado ao centavo:

  | Dias | Sem foto | Com foto |
  |---|---|---|
  | 7 | R$ 1,00 | R$ 10,00 |
  | 15 | R$ 2,14 | R$ 21,43 |
  | 30 | R$ 4,29 | R$ 42,86 |

  Os períodos de 10 e 20 dias saem da venda: "Arranca esse 10 [...] e esse 20" (Álvaro, 2026-11-15). Os valores continuam editáveis em Painel → Planos; o Álvaro pode arredondar.
- **Entram no banco:** presente de boas-vindas (7 dias sem foto e 7 com foto), prêmio do convite (7 dias com foto), compra pelo Pix (qualquer período da tabela, um Pix só) e cortesia do Painel.
- **Saem do banco:** publicar um anúncio novo, ou renovar um vencido, usa no mínimo 7 dias, e a pessoa escolhe quantos; dias que sobram (menos de 7) só prolongam um anúncio que já está no ar.
- Dias com foto podem ser usados num anúncio sem foto; o contrário não. Os dias do banco não vencem.
- Minha conta mostra o saldo no alto, com o que entrou e saiu.

A troca da tabela de preços para a proporcional entra junto com o banco (017), não antes.

### Spec fechada dos convites (2026-11-16)

O código por e-mail (016) e o banco de dias (017) já estão no ar; os convites usam os dois. Começo autorizado pelo Álvaro em 2026-11-16 ("Pode começar").

| ID | Requisito |
|---|---|
| RF-250 | Toda conta de anunciante tem 5 convites. Minha conta mostra quantos restam e a lista dos enviados, com a situação de cada um. |
| RF-251 | Convidar por e-mail: o dono informa o e-mail do amigo, e o site manda a carta com o link do convite. |
| RF-252 | Convidar pelo WhatsApp: o site cria o convite e abre o WhatsApp do dono com o texto e o link prontos. |
| RF-253 | O link do convite abre uma página com quem convidou (primeiro nome), o presente de boas-vindas e o botão para criar a conta. |
| RF-254 | Quem cria a conta pelo convite fica ligado a ele; quando publica o primeiro anúncio, com ou sem foto, quem convidou ganha 7 dias com foto no banco. |
| RF-255 | O dono pode cancelar um convite que ainda não foi aceito; o convite volta. |
| RF-256 | Painel → Configurações liga e desliga os convites; o resumo do Painel conta convites enviados, aceitos e premiados. |

| ID | Regra |
|---|---|
| RN-250 | 5 convites por conta, para sempre. Contam os aceitos e os que ainda valem; o vencido e o cancelado voltam. |
| RN-251 | O convite vale 30 dias a partir do envio. |
| RN-252 | O convite por e-mail só vale para a conta criada com aquele e-mail (o mesmo e-mail canônico, RN-155), e o código da 016 confirma que a pessoa lê aquela caixa. O do WhatsApp vale para quem tiver o link. |
| RN-253 | Não se convida um e-mail que já tem conta nem o próprio e-mail. |
| RN-254 | O prêmio sai uma vez por convite, na primeira publicação de um anúncio de quem foi convidado, e entra no extrato do banco como "Prêmio de convite" (RN-178). |
| RN-255 | Com os convites desligados no Painel, não se criam convites novos e os links não ligam contas novas; o prêmio de quem já aceitou continua valendo. |
| RN-256 | O link leva um código aleatório; o banco guarda só o hash dele, como na sessão. |
| RN-257 | Quem foi convidado ganha o mesmo presente de boas-vindas de toda conta nova (RN-174); o convite não dá dias a mais para ele. |

## Plano

- **Domínio** (`src/domain/convite/convite.ts`): constantes (RN-250, RN-251, prêmio), situação do convite (aguardando, aceito, premiado, vencido, cancelado), convites disponíveis, a carta do convite e o texto do WhatsApp.
- **Aplicação**: porta `ConviteRepository`; casos de uso `ConvidarPorEmailUseCase`, `ConvidarPeloWhatsAppUseCase`, `VerConviteUseCase`, `CancelarConviteUseCase`, `PremiarConviteUseCase`; `CadastrarAnuncianteUseCase` liga a conta ao convite; `ConfirmarPagamentoUseCase` avisa o prêmio na primeira publicação de um anúncio (porta `AoPublicar`), sem deixar uma falha do prêmio derrubar a confirmação. `ConfiguracaoRepository` ganha os convites ligados.
- **Banco** (migration `20261116180000_convites`): tabela `convites` (convidante, canal, e-mail de destino, hash do código, validade, aceito por, aceito em, premiado em, cancelado em) e `configuracoes.convitesLigados`.
- **Apresentação**: caixa "Convide amigos" em Minha conta, página `/minha-conta/convites`, página pública `/convite/[codigo]`, cadastro com o convite, botão e números no Painel.
- **ADR-22** em `02-plan.md`.

## Tarefas

- [x] T-180 Rascunho da Spec com a ideia e as perguntas (este arquivo)
- [x] T-181 Respostas do Álvaro às perguntas *(2026-11-15; trouxeram o presente de boas-vindas, o banco de anúncios, a regra dos vencidos e o código por e-mail)*
- [x] T-182 Spec fechada, Plano com ADR e Tarefas *(2026-11-16)*
- [x] T-183 Respostas às três perguntas de 2026-11-15 *(banco aprovado "a gente testa"; banco em dias com preço proporcional; VENDE-SE aprovado)*
- [x] T-184 Domínio, porta e casos de uso, com testes (RF-250 a RF-255, RN-250 a RN-257) *(`tests/unit/convites.test.ts`, 13 testes)*
- [x] T-185 Migration, repositório e consultas *(migration `20261116180000_convites`)*
- [x] T-186 Telas: caixa e página de convites, página do convite, cadastro, Painel (RF-250 a RF-256)
- [x] T-187 Testes, typecheck, build e telas num banco local *(2026-11-16: 321 testes, typecheck e build. No `next dev` com MariaDB local, o caminho inteiro: a Joana convidou por e-mail (carta no terminal, com o link), o amigo abriu o link e viu o presente e o e-mail certo, criou a conta com o e-mail já preenchido, confirmou o código, ganhou 7 + 7 dias e publicou um anúncio com os dias; o convite ficou premiado e a Joana ganhou 7 dias com foto, com o extrato "CONVITE". O Painel mostrou o botão dos convites e a linha do resumo. Não conferido na tela: o botão do WhatsApp, que abre outro aplicativo; coberto pelos testes)*
- [x] T-188 Publicar com o OK do Álvaro *(2026-11-16, 11:10: "Pode publicar". O deploy aplicou a migration `20261116180000_convites`. Conferido no ar, de fora: um código inexistente mostra "Este convite não vale mais" com o convite para criar a conta; o cadastro com um código inválido abre normalmente; "Convites" em Minha conta pede login; capa, Brasília e a página do Astra abrem. Falta o Álvaro mandar um convite de verdade pelo WhatsApp e conferir que o aplicativo abre com o texto)*
- [ ] T-189 Primeiro convite de verdade pelo WhatsApp, feito pelo Álvaro
