# 015 · Convites de cortesia

*Rascunho de 2026-11-14. Só a Spec; o Plano e as Tarefas esperam as respostas do Álvaro (perguntas no fim).*

## Spec

**Problema.** O caderno de Brasília tem poucos anúncios de verdade. A cortesia hoje é manual: o administrador publica um anúncio por vez pelo Painel (RF-84), e o item 5.2 do `08-lancamento.md` prevê fazer isso com os 100 primeiros da cidade. Não existe um jeito de quem já anuncia trazer outras pessoas, e o boca a boca é a propaganda inicial do site.

**Ideia do Álvaro (2026-11-14).** "Além dos 100 primeiros, bolar um plano para quando alguém novo chegar, usando cortesia ou não, ele ganha 5 cortesias para entregar a amigos, validado pelo e-mail ou WhatsApp."

**Proposta (para ele confirmar).**

1. **Os 100 primeiros de cada cidade** (item 5.2) passam a ser automáticos: o primeiro anúncio dos 100 primeiros anunciantes de uma cidade sai como cortesia, sem o administrador precisar publicar um por um.
2. **Cinco convites para cada anunciante novo.** Quem publica o primeiro anúncio, pago ou de cortesia, ganha 5 convites e os vê em Minha conta.
3. **O convite vai para uma pessoa.** O anunciante informa o e-mail (ou o WhatsApp) do amigo. O site manda o link do convite para esse endereço, e o convite só vale para quem abrir o link, isto é, para quem tem acesso àquele e-mail ou número. Assim, quem convida não usa o convite em si mesmo.
4. **Quem recebe** cria a conta, com o CPF de sempre (RN-02: um CPF, uma conta), e publica o primeiro anúncio como cortesia. Quem já tinha conta ou anúncio não usa convite.
5. **A corrente continua:** quem entrou por convite também ganha os seus 5 convites ao publicar.
6. **Quem convidou** pode ganhar dias quando o amigo publica. É o item 6.3 ("Indique e ganhe dias"), que entraria aqui.

**O que já existe e serve.** O e-mail sai pelo Resend (ADR-16), então a validação por e-mail não pede serviço novo. O CPF único já impede uma pessoa de abrir várias contas. A cortesia do Painel (RF-84) já registra o pagamento de R$ 0,00 como cortesia, e os convites podem usar o mesmo caminho.

**WhatsApp.** Mandar o convite ou um código de validação pelo WhatsApp de forma automática pede a API oficial do WhatsApp (Meta), que cobra por conversa e exige cadastro da empresa. Sem ela, o que dá para fazer é um botão "Enviar pelo WhatsApp", que abre o WhatsApp do próprio anunciante com o link pronto. Nesse caso não há validação: quem tiver o link usa o convite.

## Perguntas para o Álvaro

1. **O que a cortesia dá:** qual plano e quantos dias? Por exemplo, Simples por 7 dias (vale R$ 1,00) ou Com foto por 7 dias (vale R$ 10,00).
2. **Validação:** começar só pelo e-mail, que já funciona, e deixar o WhatsApp como botão sem validação?
3. **Quem ganha os 5 convites:** todo anunciante novo ou só quem publicou o primeiro anúncio? Quem entrou por convite também ganha os seus 5?
4. **Prazo e limite:** o convite vale por quantos dias depois de enviado? Há um limite de convites por cidade ou no total?
5. **Os 100 primeiros:** automáticos por cidade, como na proposta, ou continuam manuais pelo Painel?
6. **Quem convidou ganha algo** quando o amigo publica (item 6.3)? Se ganhar, quantos dias?

## Plano

A fazer depois das respostas. Deve pedir ADR: tabela nova de convites, e-mail novo e a cortesia automática.

## Tarefas

- [x] T-180 Rascunho da Spec com a ideia e as perguntas (este arquivo)
- [ ] T-181 Respostas do Álvaro às perguntas
- [ ] T-182 Spec fechada, Plano com ADR e Tarefas
