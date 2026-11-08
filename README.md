# Classificados Digitais do Brasil

Classificados por cidade no formato do caderno de jornal. Quem procura escolhe UF, cidade e seção; quem anuncia cria uma conta, monta o anúncio vendo a prévia e paga R$ 1,00 por 7 dias via Pix.

Documentação completa em [`spec/`](spec/README.md).

## Rodar localmente

```bash
npm install
cp .env.example .env   # preencha DATABASE_URL e as chaves do Cloudinary
npx prisma migrate deploy
npm run db:seed        # categorias, configuração e admin inicial
npm run dev
```

`npm run db:seed:demo` cria 14 anúncios de demonstração em Brasília/DF.

## Testes

```bash
npm test
```

## Deploy (Vercel)

O build de produção (`scripts/vercel-build.mjs`) aplica as migrations e roda o seed. Previews não alteram o banco.

Variáveis na Vercel:

| Variável | Para quê |
|---|---|
| `DATABASE_URL` | MySQL de produção |
| `CLOUDINARY_NAME`, `CLOUDINARY_KEY`, `CLOUDINARY_SECRET` | Álbum de fotos |
| `CLOUDINARY_PASTA` | Pasta das fotos (padrão `classificadosdigitalbrasil`) |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_SENHA`, `SEED_ADMIN_NOME` | Admin inicial, criado só se ainda não houver admin; troca de senha no 1º acesso |
| `SEED_DEMO=1` | Cria os anúncios de demonstração |
| `SEED_LIMPAR_DEMO=1` | Remove a demonstração (tire o `SEED_DEMO` antes) |
| `NEXT_PUBLIC_URL` | Endereço público, quando houver domínio próprio |

## Municípios

`npm run municipios` baixa de novo a lista do IBGE (só quando o IBGE criar ou renomear município).
