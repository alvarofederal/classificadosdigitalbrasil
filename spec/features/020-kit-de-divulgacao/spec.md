# 020 · Kit de divulgação

*Pedida pelo Álvaro em 2026-11-16 ("Sim, nessa ordem"), como primeiro passo da missão registrada em `07-insights.md` §4.4: levar o anúncio até onde o comprador já está.*

## Spec

**Problema.** Com o caderno ainda vazio, o comprador não chega pelo site; cada anúncio precisa trazer o próprio público. Hoje o dono tem o link curto, os botões de compartilhar (só o link) e o cartaz A4. Para o status do WhatsApp e para os grupos, que é onde as pessoas de Brasília compram e vendem, ele precisa montar a imagem e o texto sozinho.

**Ideia.** Na tela do anúncio em Minha conta, uma seção "Divulgar" com tudo pronto: uma imagem vertical para o status, uma imagem quadrada para grupos e redes, o texto para colar, o envio pelo WhatsApp e o cartaz. No celular, um toque abre o compartilhar do aparelho já com a imagem e o texto.

### Requisitos

| ID | Requisito |
|---|---|
| RF-200 | O anúncio no ar tem, em Minha conta, a seção Divulgar com: imagem para o status, imagem quadrada, texto pronto, link curto, envio pelo WhatsApp e cartaz para imprimir. |
| RF-201 | Imagem para o status do WhatsApp (1080 × 1920): o anúncio com a cara do caderno, a palavra do cartaz (VENDE-SE quando couber, feature 019), a primeira foto quando houver, título, texto, preço, cidade e o link curto em letra grande. |
| RF-202 | Imagem quadrada (1080 × 1080) para grupos, Facebook e Instagram, com o mesmo conteúdo em menos espaço. |
| RF-203 | No celular que permite, "Compartilhar com a imagem" abre o compartilhar do aparelho com a imagem e o texto juntos; nos outros, a imagem é baixada e o texto copiado. |
| RF-204 | O texto pronto traz título, preço, cidade, o começo do texto e o link curto, e pode ser copiado com um toque. |
| RF-205 | O aviso de anúncio recém-publicado leva à seção Divulgar, e cada anúncio no ar da lista de Minha conta tem o atalho "Divulgar". |

### Regras

| ID | Regra |
|---|---|
| RN-200 | As imagens só existem para anúncio no ar; fora do ar, o endereço responde "não encontrado". |
| RN-201 | As imagens e o texto mostram só o que a página pública mostra a qualquer visitante: nunca nome, CPF, e-mail ou celular do dono (Art. 5). |
| RN-202 | A foto entra só se o anúncio tiver foto; sem foto, a imagem traz o texto maior. |
| RN-203 | O texto do anúncio entra cortado num tamanho que caiba na imagem e no texto pronto, sem cortar palavra no meio, com reticências. |
| RN-204 | O link das imagens e do texto é sempre o link curto (`/a/CODIGO`). |

### Critérios de aceite

- O Astra no ar mostra a seção Divulgar com as duas imagens já com a foto da capa, o preço e o link curto.
- No celular, "Compartilhar com a imagem" abre o WhatsApp com a imagem e o texto.
- No computador, "Baixar" salva a imagem com o código do anúncio no nome.
- Anúncio expirado não tem seção Divulgar, e o endereço da imagem dele dá "não encontrado".

## Plano

- **Domínio** (`src/domain/anuncio/divulgacao.ts`): `resumir(texto, maximo)` (RN-203) e `textoParaDivulgar(anuncio, cidade, link)` (RF-204), puros e testados.
- **Apresentação**:
  - rota `src/app/imagem/[codigo]/[arquivo]/route.tsx` (`status.png` e `quadrado.png`), com `ImageResponse` do `next/og`, como a prévia do link (RF-73); a foto vem do Cloudinary forçada em JPG, porque o gerador de imagem não lê WebP nem AVIF (`urlImagem` ganha a opção de formato);
  - componente `KitDeDivulgacao` (cliente) com as miniaturas, o compartilhar com arquivo (`navigator.canShare({ files })`), baixar, copiar e WhatsApp;
  - seção `#divulgar` na tela do anúncio de Minha conta, link no aviso de recém-publicado e atalho na lista.
- Sem banco, sem ADR: não muda a arquitetura (é a mesma técnica da prévia do link).

## Tarefas

- [x] T-220 Domínio: resumo e texto pronto, com testes (RF-204, RN-201, RN-203, RN-204) *(`tests/unit/divulgacao.test.ts`, 5 testes)*
- [x] T-221 Rotas das imagens de status e quadrada (RF-201, RF-202, RN-200, RN-202) *(`/imagem/CODIGO/status.png` e `/imagem/CODIGO/quadrado.png`)*
- [x] T-222 Seção Divulgar, compartilhar com imagem, atalhos (RF-200, RF-203, RF-205)
- [x] T-223 Testes, typecheck, build e telas num banco local *(2026-11-16: 297 testes, typecheck e build passando. No `next dev` com MariaDB local: as imagens saem com e sem foto (foto de teste pública do Cloudinary), código inexistente e arquivo desconhecido dão 404; a primeira imagem com foto levou 5 s para ficar pronta, as outras menos de meio segundo. Duas correções depois de ver as imagens: o nome comprido da seção invadia a faixa do cabeçalho e passou para a linha de baixo; sem foto, o conteúdo passou a ficar no centro da moldura. A seção Divulgar aparece no anúncio no ar, com o texto pronto e os nomes de arquivo certos, e o atalho "Divulgar" na lista leva a ela. Não conferido: o compartilhar com imagem, que só aparece no celular)*
- [x] T-224 Publicar com o OK do Álvaro e conferir as imagens do Astra *(2026-11-16, 10:12: "Pode publicar", junto com a 021. No ar, a imagem quadrada do Astra saiu certa, mas a vertical não coube: com foto, texto de 267 letras e preço, o VENDE-SE encostou no título e o preço ficou por cima do texto, e o link quebrou em duas linhas. Corrigido no mesmo dia: texto resumido em 160 letras com foto, foto e letras menores, nada se espreme (flexShrink 0) e link em letra menor; conferido num banco local com o mesmo texto, foto e preço)*
