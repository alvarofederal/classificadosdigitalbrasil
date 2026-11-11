# 08 · Checklist para liberar o site

Criado em 2026-11-11. Marcar `[x]` com a data ao concluir cada item. Origem: decisão do Álvaro em 2026-11-10, de resolver o aviso de mensagem ao anunciante e ligar o Pix automático antes de divulgar o site.

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

## Depois, sem bloquear a divulgação

- [ ] **3.1** (Álvaro) Google Search Console: verificar a propriedade (o arquivo `googledbc5da7adb4bf446.html` já está em produção) e enviar o `sitemap.xml`.
- [ ] **3.2** (Álvaro) Subir as fotos do Gol por Painel → Anúncios (feature 007).
- [ ] **3.3** (Claude) Apagar o branch `teste-next-16-4-5` no GitHub, criado só para o preview.
