# 02 · Plano de arquitetura

## Stack

Next.js 16.4 (App Router, Server Actions, `proxy.ts`), React 19, TypeScript, Tailwind 4, Zod 4 para o formato dos formulários, Prisma 5.17 com MySQL (Hostinger), Cloudinary para fotos, nodemailer para e-mail por SMTP, Vercel para hospedagem, Vitest para testes.

## Camadas

```
src/
  domain/          regras puras: anúncio, pix, cpf, usuário, categoria, mensagem, UF
  application/
    ports/         interfaces que a infraestrutura implementa
    use-cases/     um caso de uso por classe (acesso, anúncios, pagamentos, admin)
    queries/       DTOs de leitura para as telas (CQRS leve)
  infrastructure/
    prisma/        repositórios e consultas
    localidades/   catálogo do IBGE (JSON gerado)
    email/         carta em HTML e em texto, correio SMTP
    pagamentos/    adaptador do Mercado Pago
    servicos.ts    relógio, códigos, bcrypt, tokens, Cloudinary
    segundo-plano.ts  tarefa depois da resposta (after do Next)
    container.ts   composition root
  lib/             sessão, formulários (Zod), formatadores, endereços
  components/      jornal (cabeçalho, filtros, caixa do anúncio, ações), formulários, modal
  app/             (site) público · (acesso) entrar/cadastro · minha-conta · painel
```

## Decisões (ADRs)

**ADR-01 · Arquitetura limpa em projeto pequeno.** Mesmo molde do Igor Veículos: domínio puro, portas, composition root. Custa alguns arquivos a mais e permite testar todas as regras sem banco.

**ADR-02 · Endereço por cidade e seção.** A pesquisa navega para `/uf/cidade/secao` em vez de devolver resultados na mesma tela. Cada combinação é uma página indexável e compartilhável, e a consulta é sempre granular (RNF-01).

**ADR-03 · Sessão própria em banco.** Cookie `cdb_sessao` com token aleatório; o banco guarda só o SHA-256. Sem NextAuth: dois perfis e login por e-mail não justificam a dependência.

**ADR-04 · Barreira dupla.** `proxy.ts` manda para o login quem não tem cookie em `/minha-conta` e `/painel`; layouts, páginas e Server Actions conferem sessão e perfil no servidor.

**ADR-05 · Upload direto ao Cloudinary.** O navegador reduz a foto (lado maior 1600 px), o servidor assina cada envio e o arquivo vai direto ao Cloudinary. O servidor confere que a URL pertence à pasta do anúncio antes de gravar.

**ADR-06 · Municípios do IBGE em JSON.** `scripts/gerar-municipios.mjs` baixa os 5.571 municípios uma vez. O servidor importa o JSON inteiro; o navegador baixa só a UF escolhida (`/municipios/DF.json`). O site não depende da API do IBGE para funcionar.

**ADR-07 · Pix estático com confirmação no painel (versão 0.1).** Cada cobrança gera um BR Code com valor e identificador de 10 letras, montado no domínio (`domain/pagamento/pix.ts`, CRC16 testado). O admin confere o identificador no extrato e confirma. Sem gateway: nenhuma taxa sobre o R$ 1,00. Próximo passo: gateway com taxa percentual e webhook, trocando só a confirmação (ver `07-insights.md`).

**ADR-08 · Renderização por requisição.** O caderno muda a cada pagamento confirmado; as páginas são dinâmicas. Cache entra quando houver volume.

**ADR-09 · Banco alterado só no deploy de produção.** `scripts/vercel-build.mjs` roda `preparar-banco-producao.ts`, `prisma migrate deploy` e o seed apenas com `VERCEL_ENV=production`. Previews não tocam no banco.

**ADR-10 · Ordem dos anúncios.** Mais recente primeiro pela data de expiração (quem pagou por último expira por último). Sem coluna extra, usando o próprio índice. *Atualizado pela feature 003:* antes vem a prioridade do plano (`anuncios.prioridade`, gravada na confirmação do pagamento).

**ADR-11 · Capa sem consulta por seção.** A capa não lista seções vazias nem consulta anúncios por seção; a única consulta nacional é a vitrine (plano Vitrine), limitada a 10 e apoiada no índice `(planoCodigo, situacao, expiraEm)`. "Perto de mim" calcula a cidade mais próxima no servidor a partir das coordenadas das 5.571 sedes municipais (base pública *kelvins/municipios-brasileiros*), sem serviço externo e sem gravar a localização.

**ADR-12 · Pix automático com gateway trocável.** Porta `GatewayPix` na aplicação; adaptador `MercadoPagoGateway` (Pix 0,99%, conta com CPF, sem certificado). O webhook só confirma se o gateway diz aprovado, a referência é uma cobrança nossa pendente e o valor bate; a confirmação é idempotente (atualização condicionada a "ainda pendente"). Sem credenciais, o sistema volta ao Pix estático do ADR-07. Trocar para Woovi/Efí = outro adaptador. *Atualizado em 2026-11-10 (T-86):* a porta ganhou `cancelar`; cobrança cancelada aqui é cancelada também no gateway, e Pix aprovado em cobrança já cancelada volta como `PAGO_APOS_CANCELAMENTO` (RN-87 a RN-89).

**ADR-13 · Endereço do site.** Na Vercel, o endereço público vem de `VERCEL_PROJECT_PRODUCTION_URL` (vira o domínio próprio quando houver); `NEXT_PUBLIC_URL` só vale fora da Vercel. Motivo: uma variável copiada de outro projeto mandava links e QR Codes para o site errado.

**ADR-14 · Pix pela API de Orders do Mercado Pago (2026-11-09).** O adaptador passa de `/v1/payments` para `/v1/orders`, e o webhook, do tópico `payment` para `order`. Motivo: o painel do Mercado Pago avisa que a API de Payments "será descontinuada em breve", e a documentação a chama de legada e recomenda Orders para integração nova. Como nenhum pagamento havia passado pelo gateway, trocar agora evita migrar com o site cobrando. A porta `GatewayPix` e os casos de uso não mudam; o `gatewayId` passa a ser o id da ordem (`ORD…`). Em aplicação de Orders o token de teste também começa com `APP_USR-`, então o painel marca como teste também a conta com a etiqueta `test_user` ou apelido `TESTUSER…` em `/users/me`.

**ADR-15 · E-mail por SMTP, enviado depois da resposta (2026-11-10).** Porta `Correio` na aplicação e adaptador `CorreioSmtp` com `nodemailer`; sem as variáveis `SMTP_*` entra o `CorreioDesligado` e o site segue como antes. SMTP, e não a API de um provedor, porque o site ainda não tem domínio próprio: uma caixa comum (Gmail com senha de app) já envia, e com domínio basta trocar as variáveis por Brevo, Resend ou SES. TLS sempre: direto na porta 465 e STARTTLS obrigatório nas outras, para a senha nunca ir em claro. O `nodemailer` fica fixado na 10.2.1: as versões anteriores à 10.1.4 têm avisos de segurança no interpretador de endereços, e a 10.5.0 tinha saído no dia da escolha. O conteúdo do e-mail é uma `Carta` montada no domínio, sem HTML; a infraestrutura dá a cara de jornal e escapa tudo. O envio roda pela porta `SegundoPlano` (adaptador com o `after` do Next): quem pediu recebe a resposta antes, e a falha do envio fica no log, sem derrubar o que já foi gravado.
