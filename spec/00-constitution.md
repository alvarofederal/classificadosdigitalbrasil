# 00 · Constituição

Princípios que valem para todo código do Classificados Digitais do Brasil. Uma mudança que fere um artigo precisa de ADR em `02-plan.md`.

## Art. 1 · Regra de dependência

As dependências apontam para dentro: `app` → `infrastructure` → `application` → `domain`.

- `domain/` é TypeScript puro: sem Next, React, Prisma, Zod, Cloudinary ou bcrypt.
- `application/` conhece só o domínio e as próprias portas (interfaces).
- `infrastructure/` implementa as portas (Prisma, Cloudinary, IBGE, bcrypt).
- `app/`, `components/` e `lib/` são a apresentação.

Verificado em `tests/unit/arquitetura.test.ts`.

## Art. 2 · SOLID

- **S**: um caso de uso por classe, uma responsabilidade por arquivo.
- **O**: formatação nova do anúncio entra como valor de catálogo (`MOLDURAS`, `ESTILOS_DE_TITULO`), sem `if` espalhado.
- **L**: os fakes de `tests/fakes.ts` substituem os repositórios Prisma sem mudar o caso de uso.
- **I**: portas pequenas (`AnuncioRepository`, `FotoStorage`, `Localidades`).
- **D**: `infrastructure/container.ts` é o único lugar que escolhe implementações.

## Art. 3 · Regras de negócio

1. Toda regra mora no domínio ou num caso de uso, nunca na tela.
2. Dinheiro em centavos inteiros (`Centavos`); no banco, `Decimal`.
3. Datas de expiração são instantes UTC; a tela formata no fuso de Brasília.
4. Erro de negócio é valor (`Result`), não exceção.
5. A tela nunca é a última barreira: toda Server Action confere sessão e perfil de novo.

## Art. 4 · Apresentação

1. Server Components por padrão; `"use client"` só onde há interação.
2. Formato (Zod) na Server Action, regra no caso de uso.
3. Textos objetivos, sem slogan nem frase de efeito.
4. Acessível: rótulo em todo campo, foco no primeiro erro, modais com Radix.

## Art. 5 · Dados pessoais (LGPD)

1. CPF, e-mail e celular do anunciante nunca aparecem no site público.
2. Senha só como hash bcrypt; sessão só como hash SHA-256 do token.
3. Quem manda mensagem informa só nome e um contato, que vão apenas ao dono do anúncio.

## Art. 6 · Desempenho

A lista pública é sempre de uma cidade e uma seção (RNF-01). Não existe consulta "todos os anúncios do Brasil" no site.

## Art. 7 · A spec é a memória do projeto

A conversa com o assistente não é registro: pode sumir sem aviso, como aconteceu em 2026-11-09 (`05-tasks.md`, seção *Continuidade*). O que não está em `spec/` ou no código conta como perdido.

1. Toda decisão vai para `spec/` quando é tomada, não no fim da sessão.
2. O que foi combinado e ainda não foi feito entra como pendência em `05-tasks.md` ou nas tarefas da funcionalidade.
3. Ao parar com trabalho pela metade, escrever em *Continuidade* onde parou e qual é o próximo passo.
4. Código e spec da mesma mudança entram no mesmo commit.
