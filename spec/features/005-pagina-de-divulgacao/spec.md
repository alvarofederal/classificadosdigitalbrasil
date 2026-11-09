# 005 · Página do anúncio para divulgação

## Spec

**Ideia do Álvaro.** Clicar no classificado abre uma página simples e individual, com foto e caixa de conversa, que o anunciante divulga em qualquer plataforma. O boca a boca é a propaganda inicial.

**Melhorias propostas (incluídas).**

1. **Link curto**: `/a/CODIGO`, fácil de ditar e de caber em post.
2. **Prévia de recorte de jornal** no WhatsApp, Facebook e Instagram: a imagem do link é o próprio anúncio com a manchete CLASSIFICADOS. Cada compartilhamento mostra a marca.
3. **Botões de divulgar**: WhatsApp, Facebook, Telegram, X, copiar link e compartilhar do celular.
4. **Cartaz para imprimir**: folha A4 com "VENDE-SE"/título, preço, texto, foto e QR Code do anúncio, para colar no vidro do carro, no mural da igreja, na padaria. O QR leva à página do anúncio.
5. **Contador de visitas** visível para o dono: motiva a divulgar mais.
6. **Rodapé "Anuncie você também por R$ 1,00"**: quem chega pelo anúncio de alguém conhece a plataforma.

| ID | Requisito |
|---|---|
| RF-70 | Clicar em qualquer parte do anúncio no caderno abre a página dele (os ícones de mensagem e álbum continuam abrindo os modais). |
| RF-71 | A página vale para todos os planos: foto principal e miniaturas (quando há), o anúncio no formato do caderno, caixa de conversa aberta na página, botões de divulgar, cartaz, denúncia e o convite para anunciar. |
| RF-72 | `/a/CODIGO` redireciona para `/anuncio/CODIGO`. |
| RF-73 | Imagem de prévia (Open Graph) gerada com o recorte do anúncio. |
| RF-74 | `/anuncio/CODIGO/cartaz` imprime o cartaz A4 com QR Code. |
| RF-75 | Cada abertura da página soma uma visita; o dono vê o total em Minha conta. |

| ID | Regra |
|---|---|
| RN-70 | Anúncio fora do ar mostra "Este anúncio saiu do caderno" com o convite para anunciar, em vez de erro. |
| RN-71 | A contagem de visitas não guarda IP nem nada de quem visitou. |

## Plano

Coluna `anuncios.visualizacoes`. `opengraph-image.tsx` com `next/og`. Cartaz em rota própria sem o cabeçalho do site, com CSS de impressão e QR gerado no servidor (`qrcode`).

## Tarefas

- [x] T-70 Anúncio inteiro clicável
- [x] T-71 Página nova do anúncio com conversa e botões
- [x] T-72 Link curto, prévia de recorte, cartaz com QR
- [x] T-73 Visitas
