# 02 · Plano de arquitetura

## Stack

Next.js 16 (App Router, Server Actions, `proxy.ts`), React 19, TypeScript, Tailwind 4, Prisma 5.17 com MySQL (Hostinger), Cloudinary para fotos, Vercel para hospedagem, Vitest para testes.

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
    servicos.ts    relógio, códigos, bcrypt, tokens, Cloudinary
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

**ADR-10 · Ordem dos anúncios.** Mais recente primeiro pela data de expiração (quem pagou por último expira por último). Sem coluna extra, usando o próprio índice.
