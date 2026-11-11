# 08 · Checklist: liberar o site e as melhorias

Criado em 2026-11-11. Marcar `[x]` com a data ao concluir cada item. As prioridades 1 a 3 liberam o site; as de 4 a 8 são as melhorias, na ordem em que valem a pena. Origem: decisão do Álvaro em 2026-11-10, de resolver o aviso de mensagem ao anunciante e ligar o Pix automático antes de divulgar o site.

**Quem faz:** *Álvaro* (precisa de login, senha ou conta dele) ou *Claude* (código, specs, conferência). Senhas e chaves nunca vão para a conversa nem para o repositório.

**Já está pronto e não se repete:** o código dos dois (010 e 006) em produção desde 2026-11-11; aplicação e credencial de produção no Mercado Pago; webhook cadastrado; `MERCADO_PAGO_ACCESS_TOKEN` e `MERCADO_PAGO_WEBHOOK_SECRET` na Vercel; 156 testes passando.

## Prioridade 1 · Aviso de mensagem por e-mail (T-125)

Vem primeiro porque leva uns 20 minutos, os passos já são conhecidos e vale desde o primeiro anúncio, inclusive os de cortesia: sem o aviso, quem recebe mensagem só descobre entrando em Minha conta.

- [ ] **1.1** (Álvaro) Escolher a caixa que envia os avisos. Sem domínio próprio, uma conta Gmail do site (limite de 500 e-mails por dia).
- [ ] **1.2** (Álvaro) No Gmail, ativar a verificação em duas etapas e criar uma **senha de app** em myaccount.google.com/apppasswords, com o nome "Classificados".
- [ ] **1.3** (Álvaro) Na Vercel, em Settings → Environment Variables → Production, cadastrar `SMTP_HOST` (`smtp.gmail.com`), `SMTP_USER` (o endereço completo) e `SMTP_PASS` (a senha de app). `SMTP_PORT` e `SMTP_FROM` são opcionais.
- [ ] **1.4** (Álvaro) Fazer o **Redeploy** de produção para as variáveis valerem.
- [ ] **1.5** (Álvaro) Painel → Configurações → *Aviso de mensagem por e-mail*: conferir que os itens estão marcados e clicar em **Enviar e-mail de teste**. Se algum item falhar, o painel mostra o motivo: copiar o texto e passar ao Claude.
- [ ] **1.6** (Álvaro) Mandar uma mensagem de verdade pelo botão de um anúncio no ar (o do Gol, código 9TTTMQ, é da conta de administrador) e ver o aviso chegar em menos de um minuto, com texto e contato.
- [ ] **1.7** (Álvaro) Responder ao aviso e ver se a resposta vai para quem escreveu (contato por e-mail) ou se o link do WhatsApp abre (contato por telefone).
- [ ] **1.8** (Claude) Marcar a T-125 como feita em `features/010-aviso-de-mensagem/spec.md` e em `05-tasks.md`, com a data e o que foi conferido.

## Prioridade 2 · Pix automático (T-84 e T-14)

O Pix real de R$ 1,00 nunca foi concluído. O Álvaro lembra de um defeito, e **o relato exato não está registrado** em nenhuma spec; a conversa onde isso foi dito se perdeu. Por isso o primeiro item é registrar o erro.

- [ ] **2.1** (Álvaro) Repetir a tentativa e anotar o que acontece: em que tela, o texto exato do erro (ou um print) e se o Pix chegou a ser gerado. Passar ao Claude.
- [ ] **2.2** (Álvaro) Painel → Configurações (passo 6 da spec 006): conferir "Conta conectada", "Credencial de produção", "Assinatura secreta" e "Endereço do aviso". É ali que se vê se o token é de produção (`APP_USR-`) ou de teste (`TEST-`).
- [ ] **2.3** (Álvaro) Conferir no Mercado Pago: a conta tem uma **chave Pix** cadastrada no app (Seu perfil → Pix → Minhas chaves) e o webhook de produção aponta para `https://classificadosdigitalbrasil.vercel.app/api/pagamentos/mercadopago` com o evento *Order (Mercado Pago)*.
- [ ] **2.4** (Álvaro) Entrar com uma conta de anunciante de **e-mail diferente** do e-mail da conta Mercado Pago. O Mercado Pago recusa cobrança em que quem paga e quem recebe são a mesma pessoa.
- [ ] **2.5** (Álvaro) Criar um anúncio Simples de 7 dias (R$ 1,00) e ver a tela gerar o QR Code e o "copia e cola".
- [ ] **2.6** (Álvaro) Pagar o Pix pelo app de **outro banco** e ver a tela mostrar "Pagamento confirmado" sozinha (consulta a cada 5 segundos) e o anúncio entrar no ar.
- [ ] **2.7** (Claude) Se alguma etapa falhar: ler o log do erro na Vercel e a resposta do Mercado Pago, achar a causa e corrigir no código, com teste e spec.
- [ ] **2.8** (Álvaro, com o Claude) Conferir o cancelamento (passo 8 da spec 006, T-86): gerar um Pix, trocar de plano antes de pagar e ver, no Mercado Pago, a ordem antiga cancelada.
- [ ] **2.9** (Claude) Marcar T-84, T-14 e o passo 8 como feitos em `features/006-pix-automatico/spec.md` e em `05-tasks.md`.

Possíveis causas do defeito, a confirmar com o erro do item 2.1: pagador com o mesmo e-mail da conta Mercado Pago; token de teste no lugar do de produção; conta sem chave Pix; assinatura secreta errada (o pagamento entra, mas o webhook recusa; a tela deveria confirmar pela consulta de reserva).

## Prioridade 3 · Pendências rápidas, sem bloquear a divulgação

- [ ] **3.1** (Álvaro) Google Search Console: verificar a propriedade (o arquivo `googledbc5da7adb4bf446.html` já está em produção) e enviar o `sitemap.xml`.
- [ ] **3.2** (Álvaro) Subir as fotos do Gol por Painel → Anúncios (feature 007).
- [ ] **3.3** (Claude) Apagar o branch `teste-next-16-4-5` no GitHub, criado só para o preview.

---

# Melhorias (acrescentadas em 2026-11-11)

As ideias abaixo são as da resposta de 2026-11-10 sobre novidades e usuários de graça (detalhes em `07-insights.md` §4.1 e §4.2), na ordem sugerida ali. Cada item de site que for adiante ganha a sua pasta em `spec/features/` antes do código. Quem faz os itens de site é o Claude, com as decisões do Álvaro.

## Prioridade 4 · Primeiras novidades do site (pequenas)

- [ ] **4.1** Bairro em caixa alta abrindo o anúncio (ASA NORTE, TAGUATINGA), com filtro por bairro dentro da seção. Hoje não existe campo de bairro, e no IBGE o DF inteiro é um município só.
- [ ] **4.2** Linha "Tratar:" com WhatsApp, opcional, dentro do anúncio. É um contato próprio do anúncio, não o celular da conta (Art. 5), e pede ADR.
- [ ] **4.3** Anúncios no `sitemap.xml`. Hoje entram só as cidades e as seções com anúncio no ar.

## Prioridade 5 · Encher Brasília (trabalho do Álvaro, sem código novo)

- [ ] **5.1** (Álvaro) Fechar o foco: só Brasília e duas ou três seções (Veículos, Serviços, Imóveis) até encher. Uma seção com 30 anúncios vale mais que 18 seções com 2.
- [ ] **5.2** (Álvaro) Encher com cortesia pelo painel, com limite (os 100 primeiros da cidade). Começar por quem tem estoque, como uma revenda (Igor Veículos), e por quem renova, como prestador de serviço.
- [ ] **5.3** (Álvaro) Atender como balcão: a pessoa manda o texto pelo WhatsApp, o Álvaro monta o anúncio e libera a cortesia.
- [ ] **5.4** (Álvaro) Oferecer a placa, não o site: "Placa de VENDE-SE com QR Code por R$ 1". O cartaz A4 já existe.
- [ ] **5.5** (Álvaro) A história como pauta: oferecer "classificados com cara de jornal, a R$ 1" a páginas de bairro e grupos de nostalgia da cidade.

## Prioridade 6 · Edição da semana e indicação

- [ ] **6.1** Edição da semana: cada cidade ganha número e data de edição; a página sai como imagem para grupo e status do WhatsApp e como A4 com QR Code para imprimir.
- [ ] **6.2** (Álvaro) Circular a edição uma vez por semana nos grupos de compra e venda, com o OK do administrador, e impressa em padaria, igreja e condomínio. Depende do 6.1.
- [ ] **6.3** Indique e ganhe dias: quem chega pelo "Anuncie você também" do rodapé de um anúncio e publica dá 7 dias ao dono daquele anúncio. Falta registrar de quem veio a indicação e a regra dos dias.

## Prioridade 7 · Demais novidades com cara de jornal

- [ ] **7.1** Foto pequena em preto e branco, com os pontinhos de jornal, na coluna do anúncio do plano Com foto. Hoje a foto só aparece na página do anúncio.
- [ ] **7.2** Seções gratuitas de utilidade: Achados e perdidos, Animais desaparecidos, Doa-se e Procura-se. O cadastro com CPF continua valendo.
- [ ] **7.3** Cartaz de PROCURA-SE, reaproveitando o cartaz A4 que já existe. Acompanha o 7.2.
- [ ] **7.4** Recortar: uma tesourinha guarda o anúncio no aparelho de quem procura, sem cadastro, numa página "Meus recortes".
- [ ] **7.5** Coluna do anunciante: todos os anúncios de uma revenda, imobiliária ou prestador sob uma tarja com o nome, com link para divulgar.
- [ ] **7.6** Carimbo (URGENTE, ÚLTIMOS DIAS).
- [ ] **7.7** Mãozinha apontando (☞).
- [ ] **7.8** Primeira letra grande.
- [ ] **7.9** Vinheta da seção (carro, casa, chave).
- [ ] **7.10** Dados estruturados para o Google. O de vaga pode pôr Empregos na caixa de vagas do Google, se cumprir as exigências deles.

As peças 7.6 a 7.9 entram como valores de catálogo (Art. 2), na mesma tinta, e podem virar adicional pago depois.

## Prioridade 8 · Ideias mais antigas, já guardadas nas specs

Vêm de *Próximos passos sugeridos* e do §4 de `07-insights.md` e do *Depois* da spec 010.

- [ ] **8.1** Créditos (carteira) para renovar com um clique.
- [ ] **8.2** E-mail "seu anúncio vence amanhã, renove". Precisa de agendador diário.
- [ ] **8.3** E-mail "seu anúncio está no ar", com os links para divulgar.
- [ ] **8.4** Aviso de chamado novo para o administrador.
- [ ] **8.5** Opção para o anunciante desligar o aviso de mensagem.
- [ ] **8.6** "Subir para o topo" por um valor pequeno.
- [ ] **8.7** Plano mensal do prestador de serviço, com renovação automática.
- [ ] **8.8** Rodar o teste de carga com k6 fora de produção (feature 008).
- [ ] **8.9** Reduzir o tamanho das funções do servidor (aviso do Turbopack sobre o cliente do Prisma em `src/generated/prisma`).

**Limite do que foi recuperado.** No backup existe uma única resposta com ideias, a de 2026-11-10 às 19:02. A conversa seguiu depois disso sem registro. Se o Álvaro lembrar de uma ideia que não está aqui, ela entra na prioridade certa.
