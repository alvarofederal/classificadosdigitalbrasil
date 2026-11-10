# 04 · Design system

Referência: a página de classificados impressa que o Álvaro enviou em 2026-11-08 (manchete "CLASSIFICADOS" ocupando a largura, cinco colunas densas de anúncios pequenos, tarjas pretas das seções dentro das colunas, molduras simples, duplas e tracejadas, fileiras de estrelas). Página branca e tinta preta. Uma cor só para os anúncios; vermelho e verde aparecem apenas em avisos do sistema.

## Cores (tokens em `src/app/globals.css`)

| Token | Valor | Uso |
|---|---|---|
| `papel` / `papel-claro` | `#ffffff` | fundo da página, dos anúncios e dos campos |
| `papel-escuro` | `#ececec` | hover |
| `tinta` | `#111111` | texto, fios, tarjas, botões |
| `tinta-suave` | `#555555` | textos secundários |
| `perigo` | `#a3161a` | erros, remover |
| `sucesso` | `#1d6b3a` | "No ar", confirmações |

As variáveis das fontes do `next/font` ficam em `<html>` (não no `<body>`): é ali que o tema resolve `--font-manchete`, `--font-titulo` e `--font-texto`. No `<body>` as fontes não carregavam.

## Página do caderno

- `Caderno` (`components/jornal/caderno.tsx`): colunas CSS, 1 no celular, 2 a partir de 460 px, 3/4/5 em tablet, notebook e monitor.
- `TarjaSecao`: tarja preta da seção dentro da coluna, sempre junto do primeiro anúncio (nunca sozinha no pé da coluna).
- Anúncio: título Oswald 13 px em caixa alta, texto PT Serif 12 px, rodapé com ícone de mensagem, código e ícone do álbum.
- Capa: convites da casa por seção (sem consulta de anúncios). Cidade: todas as seções, até 8 anúncios cada, com "ver todos". Seção: todos, 60 por página.
- A prévia do editor tem a largura de uma coluna do caderno.

## Tipografia

| Papel | Fonte |
|---|---|
| Manchete "CLASSIFICADOS" | Anton |
| Títulos, tarjas, rótulos, botões | Oswald (caixa alta) |
| Texto dos anúncios e páginas | PT Serif |

## Peças

- **Cabeçalho**: fio grosso, manchete, fio duplo, linha com data por extenso, "Digitais do Brasil" e o preço do anúncio.
- **Faixa** (`.faixa`): tarja preta das seções.
- **Colunas** (`.colunas-jornal`): os quadrados descem em colunas com fio entre elas (1 no celular, até 4 no computador).
- **Caixa do anúncio** (`components/jornal/caixa-anuncio.tsx`): moldura, título, texto, preço, estrelas e o rodapé com ícone de conversa, código e ícone de álbum. É a mesma peça no caderno, na prévia do editor e na página do anúncio.
- **Campos e botões**: cantos retos, fio preto, foco com contorno preto.
- **Modal**: borda dupla de tinta com sombra deslocada, como um recorte.
- **E-mail** (`infrastructure/email/modelo.ts`): a mesma página branca e tinta preta, com fio grosso, manchete e fio duplo. Fontes da web não carregam em e-mail; valem as parecidas que todo programa tem (Impact na manchete, Arial Narrow nos rótulos, Georgia no texto). A mensagem de quem escreveu vem numa caixa de fio simples e o botão é uma tarja preta.
