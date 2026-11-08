# 04 · Design system

Referência: o caderno de classificados impresso. Papel claro, tinta preta, fios, tarjas pretas com letras brancas nas seções. Uma cor só para os anúncios; vermelho e verde aparecem apenas em avisos do sistema.

## Cores (tokens em `src/app/globals.css`)

| Token | Valor | Uso |
|---|---|---|
| `papel` | `#f4f1e8` | fundo da página |
| `papel-claro` | `#fbf9f3` | fundo do quadrado, campos, cartões |
| `papel-escuro` | `#e7e1d1` | hover, destaques suaves |
| `tinta` | `#141412` | texto, fios, tarjas, botões |
| `tinta-suave` | `#55534c` | textos secundários |
| `perigo` | `#a3161a` | erros, remover |
| `sucesso` | `#1d6b3a` | "No ar", confirmações |

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
