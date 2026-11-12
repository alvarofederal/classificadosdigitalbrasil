# 011 · Anúncios no Google

## Spec

**Problema.** O site está completo, mas quase ninguém chega a ele: em 2026-11-12 o anúncio do Astra tinha 12 visitas e nenhuma mensagem, e parte das visitas era do próprio Álvaro. O Google é a fonte de visita que não custa nada e se acumula. Hoje o `sitemap.xml` só lista a capa, a página de divulgação, as cidades e as seções; os anúncios, que são o que as pessoas procuram ("astra 2002 brasília"), ficam de fora. E a página do anúncio não diz ao Google, em formato que ele lê, o que está à venda, por quanto e onde. Decisão do Álvaro em 2026-11-12, entre as próximas ações (itens 4.3 e 7.10 do `08-lancamento.md`).

**Quem usa.** Quem procura no Google; o anunciante, que recebe a visita; o Álvaro, que cadastra o site no Search Console (item 3.1).

| ID | Requisito |
|---|---|
| RF-110 | Todo anúncio no ar entra no `sitemap.xml` com o seu endereço público (`/anuncio/CODIGO`) e a data em que foi publicado ou renovado. Anúncio que sai do ar sai do sitemap na leitura seguinte. |
| RF-111 | A página do anúncio traz dados estruturados (JSON-LD de schema.org) com a trilha Início › cidade › seção › anúncio. |
| RF-112 | Anúncio com preço traz também o produto e a oferta: título, texto, seção, fotos, preço em reais, válido até o fim do prazo no ar, e a cidade. |

| ID | Regra |
|---|---|
| RN-110 | Os dados estruturados só repetem o que a página já mostra a qualquer visitante. Nunca levam nome, CPF, e-mail ou celular do dono (Art. 5). |
| RN-111 | Anúncio sem preço não vira produto, porque o Google exige preço, avaliação ou nota para produto. Fica só a trilha. |
| RN-112 | Anúncio de Empregos e Formação Profissional não vira produto: vaga, currículo e aula não são mercadoria. O formato de vaga do Google (`JobPosting`) pede a empresa que contrata, que o anúncio não tem; fica para depois. |
| RN-113 | O texto do anunciante entra no JSON-LD com `<`, `>` e `&` escritos como `<`, `>` e `&`. Assim um texto com `</script>` não fecha o bloco nem vira código na página. |
| RN-114 | O sitemap leva no máximo 40.000 anúncios, os publicados mais recentemente primeiro. O limite do formato é 50.000 endereços por arquivo; a folga fica para cidades e seções. |

**Aceite.** Em produção, `/sitemap.xml` lista `/anuncio/4DPUMX` (Astra), e a página desse anúncio tem um bloco `application/ld+json` com a trilha e o produto de R$ 20.000,00 em Brasília/DF. Um anúncio sem preço tem só a trilha.

## Plano

- Nova consulta `ClassificadosQuery.anunciosNoArDoSitemap(agora, limite)`, que devolve só `codigo` e `publicadoEm` dos anúncios no ar, ordenados por `publicadoEm` decrescente (RN-114). O Prisma usa o mesmo filtro `noAr` das outras listas.
- `src/lib/dados-estruturados.ts` (apresentação) monta o JSON-LD a partir do `AnuncioPublicoDTO`, da cidade e do endereço do site, e o transforma em texto seguro para a tag (RN-113). Não muda nenhuma camada nem a regra de dependências, por isso não há ADR novo.
- A página `/anuncio/[codigo]` coloca o bloco num `<script type="application/ld+json">`, como a documentação do Next recomenda.
- Data no sitemap: `publicadoEm`, e não `atualizadoEm`, porque cada visita ao anúncio também muda `atualizadoEm` (contador de visitas) e o Google passaria a desconfiar da data.
- A oferta usa `availability: InStock` e `priceValidUntil` = dia em que o anúncio sai do ar. Não leva `itemCondition`: o site não pergunta se é novo ou usado.

## Tarefas

- [x] T-140 Consulta dos anúncios do sitemap e anúncios no `sitemap.xml` (RF-110, RN-114)
- [x] T-141 Montagem do JSON-LD com testes (RF-111, RF-112, RN-110 a RN-113; `tests/unit/dados-estruturados.test.ts`)
- [x] T-142 Bloco JSON-LD na página do anúncio
- [x] T-143 Publicar e conferir em produção: sitemap com o Astra e o bloco na página dele. *2026-11-12: commit `12192c1`, deploy das 08:22. O `sitemap.xml` lista os 21 anúncios no ar, o Astra primeiro; a página do Astra tem a trilha e o produto de R$ 20.000,00 em Brasília/DF, válido até 18/11; o anúncio de Empregos "Contrata-se balconista" tem só a trilha.*
- [x] T-144 (Álvaro) Search Console: verificar o site e enviar o `sitemap.xml` (item 3.1 do `08-lancamento.md`). *2026-11-12: feito e sitemap enviado, segundo o Álvaro. A leitura pelo Google e a indexação levam alguns dias e não foram conferidas.*

## Depois

- `JobPosting` para Empregos, se o anúncio ganhar o campo da empresa.
- Trilha (`BreadcrumbList`) também nas páginas de cidade e de seção.
- Conferir no teste de resultados avançados do Google (search.google.com/test/rich-results) depois do deploy; é uma ferramenta do Google com login, fica com o Álvaro.
