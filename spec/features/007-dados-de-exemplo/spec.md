# 007 · Anúncio do Gol e exemplos em Brasília

## Spec

| ID | Requisito |
|---|---|
| RF-90 | O anúncio do Gol G4 (código `9TTTMQ`, conta do admin) fica no ar por 30 dias no plano **Vitrine**, o mais caro, com o Pix dado como aprovado (cortesia). Aparece no topo de Veículos em Brasília e na vitrine da capa. |
| RF-91 | Um anúncio de exemplo por seção em Brasília/DF (18), por 30 dias, com planos variados para mostrar a diferença visual. Ficam numa conta separada de exemplos e o texto termina com "(Anúncio de exemplo.)". |
| RF-92 | Os exemplos não são apagados automaticamente; o Álvaro remove pelo painel conforme testa. |
| RF-93 | O admin consegue editar qualquer anúncio e subir as fotos dele pelo painel (Painel → Anúncios → abrir). |

**Pendente:** as fotos do Gol. Não há fotos reais do carro, e foto inventada num anúncio de venda engana o comprador. Ou o Álvaro sobe pelo painel, ou manda os arquivos para subir.

## Tarefas

- [x] T-90 Script `scripts/dados-de-exemplo.ts` (idempotente)
- [x] T-91 Painel → Anúncios → detalhe com editor, álbum, mensagens, pagamentos e cortesia
- ~~T-92 Fotos do Gol (depende do Álvaro)~~ Cancelada pelo Álvaro em 2026-11-11: o Gol é só exemplo e fica sem fotos.
