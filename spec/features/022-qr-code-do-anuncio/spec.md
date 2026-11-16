# 022 · QR Code do anúncio

*Pedida pelo Álvaro em 2026-11-16: "gerar um componente interno do sistema, para trabalharmos muito com QR Code; todos os anúncios da página única ou esses que você fez agora podem ter QR Code, e enviar para o anúncio. Nos pequenos, na pesquisa, é difícil colocar."*

## Spec

**Problema.** Só o cartaz A4 tem QR Code, gerado dentro da própria página. A página do anúncio e as imagens de divulgação (feature 020) mostram o link escrito, que precisa ser digitado. Quem vê o anúncio numa tela de computador, numa imagem num grupo aberto no computador ou num papel, precisa de um jeito de abrir o anúncio no celular apontando a câmera.

**Ideia.** Um QR Code único do sistema, sempre levando ao anúncio pelo link curto, usado em todo lugar onde cabe: cartaz, página do anúncio, imagens de divulgação e um arquivo do QR para o dono baixar e pôr onde quiser. Fica fora dos quadrinhos do caderno e da pesquisa, pequenos demais para um QR legível.

### Requisitos

| ID | Requisito |
|---|---|
| RF-220 | Um componente do sistema gera o QR Code do anúncio; cartaz, página do anúncio, imagens de divulgação e o arquivo do QR usam o mesmo. |
| RF-221 | A página pública do anúncio mostra o QR Code com "Aponte a câmera do celular para abrir este anúncio". |
| RF-222 | As imagens para o status e quadrada (feature 020) trazem o QR Code junto do link curto. |
| RF-223 | A seção Divulgar de Minha conta oferece o QR Code sozinho para baixar (`/imagem/CODIGO/qrcode.png`). |

### Regras

| ID | Regra |
|---|---|
| RN-220 | O QR Code leva sempre ao link curto do anúncio (`/a/CODIGO`). |
| RN-221 | Tinta preta sobre fundo branco, com margem e correção de erro média, para ler impresso, em tela e em foto. |
| RN-222 | Os quadrinhos do caderno, da seção e da pesquisa não têm QR Code. |
| RN-223 | O arquivo do QR, como as imagens de divulgação, só existe para anúncio no ar (RN-200). |

## Plano

- `src/lib/qrcode.ts` (apresentação): `linkCurtoDoAnuncio(codigo)` e a geração do QR em PNG e em data URL com as cores e a margem da RN-221. O pacote `qrcode` já está no projeto (cartaz e Pix).
- Componente de servidor `QrCodeDoAnuncio` (`src/components/jornal/qr-code.tsx`), usado no cartaz e na página do anúncio.
- A rota `/imagem/[codigo]/[arquivo]` ganha `qrcode.png` e passa o QR às imagens de status e quadrada (rodapé com QR e link).
- Sem banco, sem ADR.

## Tarefas

- [x] T-240 Biblioteca do QR e componente, com testes (RF-220, RN-220, RN-221) *(`src/lib/qrcode.ts`, `src/components/jornal/qr-code.tsx`, `tests/unit/qrcode.test.ts`)*
- [x] T-241 Cartaz e página do anúncio com o componente (RF-220, RF-221)
- [x] T-242 QR nas imagens de divulgação e o arquivo do QR na seção Divulgar (RF-222, RF-223, RN-223) *(para caber o QR no rodapé, a foto da vertical passou de 520 para 470 px de altura e a da quadrada de 440 para 390)*
- [x] T-243 Testes, typecheck, build e imagens conferidas *(2026-11-16: 305 testes, typecheck e build. No `next dev` com MariaDB local, com o texto, a foto e o preço iguais aos do Astra: as duas imagens trazem o QR no rodapé e tudo cabe; `qrcode.png` sai com 1000 px; a página pública mostra o QR com a legenda e o cartaz continua com o QR)*
- [ ] T-244 Publicar com o OK do Álvaro
