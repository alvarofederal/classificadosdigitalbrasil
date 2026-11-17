# 023 · Cabeçalho com DIGITAIS DO BRASIL de ponta a ponta

*Pedido do Álvaro em 2026-11-16, à tarde, com a imagem da manchete CLASSIFICADOS.*

## Spec

**Problema.** No cabeçalho do site, "Digitais do Brasil" ficava miúdo, no canto esquerdo da linha fina abaixo da manchete, e o nome do jornal não se lia inteiro de uma vez.

**Pedido.** "Coloca o DIGITAIS DO BRASIL abaixo dos CLASSIFICADOS, começando no C e finalizando no S, de ponta a ponta, e coloque alguma coisa no lugar."

**O que vai no lugar.** Três opções foram mostradas (a data por extenso, a cidade da página, o número da edição). O Álvaro escolheu **a cidade da página**.

| ID | Requisito |
|---|---|
| RF-230 | Logo abaixo da manchete CLASSIFICADOS vem DIGITAIS DO BRASIL numa linha da mesma largura: a primeira letra começa onde começa o C e a última termina onde termina o S. Vale em qualquer largura de tela, na capa e no cabeçalho menor das outras páginas. |
| RF-231 | Na linha fina abaixo do nome, no lugar onde ficava "Digitais do Brasil", vai o lugar da página: a cidade e a UF (BRASÍLIA · DF) na página da cidade, na da seção e na do anúncio; TODO O BRASIL nas outras. O preço do anúncio continua à direita. |

| ID | Regra |
|---|---|
| RN-230 | A cidade vem do endereço (`/df/brasilia`, `/df/brasilia/veiculos`) ou, na página do anúncio, da cidade do anúncio. Endereço de cidade que não existe e anúncio fora do ar mostram TODO O BRASIL. |
| RN-231 | O texto do lugar sai de uma função só (`lugarDoCabecalho`): "Cidade · UF", ou "Todo o Brasil" sem cidade. |
| RN-232 | DIGITAIS DO BRASIL se ajusta à largura da manchete: o tamanho da letra acompanha o da manchete e o espaço entre as letras se divide por igual, com o espaço entre as palavras maior que o espaço entre as letras. |

Decisão tomada sem perguntar, que ele pode mudar: nas páginas sem cidade (capa, termos, como funciona, entrar, Minha conta) aparece TODO O BRASIL.

**Ajuste depois de ver no ar (2026-11-16, à noite).** Com a captura da capa num monitor de 1561 px: "Viu que ficou bem desalinhado né, ficou grande o nome CLASSIFICADOS, pode diminuir 25%".

| ID | Requisito |
|---|---|
| RF-232 | A manchete grande (capa, cidade, seção e anúncio) fica 25% menor em todas as larguras de tela: no máximo 10,125 rem (162 px, antes 216 px), 11,4% da largura da tela (antes 15,2%) e no mínimo 2,55 rem (antes 3,4 rem). DIGITAIS DO BRASIL acompanha e continua de ponta a ponta (RF-230). O cabeçalho menor das outras páginas não muda. |

Fora deste pedido: o cartaz A4, as imagens de divulgação, as prévias para as redes e o e-mail têm cabeçalho próprio, com "Digitais do Brasil" no lugar antigo. Ficam como estão.

## Plano

- **Ajuste à largura (RF-230, RN-232).** A manchete e a linha de baixo ficam na mesma caixa, que tem a largura da palavra CLASSIFICADOS. A linha de baixo é uma fileira de letras com o espaço dividido por igual (`flex` com `justify-content: space-between`), sem JavaScript. O tamanho da letra é uma fração da manchete (em `em`), então as duas crescem e diminuem juntas no celular e no computador. Uma pequena correção, também em `em`, alinha o desenho das letras (a tinta) e não só a caixa delas: o C e o S da Anton têm folga lateral diferente do D e do L da Oswald.
- **Lugar da página (RF-231, RN-230).** O cabeçalho fica no layout de `(site)`, que não recebe a cidade das páginas de baixo. O lugar entra por uma rota paralela, `(site)/@lugar`, com uma página para cada endereço do site (capa, termos, cidade, seção e anúncio) e um `default.tsx`. O layout recebe o espaço `lugar` e o passa ao cabeçalho. Ver ADR-23.
- **Anúncio sem consulta a mais.** A busca do anúncio passa para `anuncio/[codigo]/buscar.ts`, com `cache` do React: a página, o título da aba e o lugar do cabeçalho usam a mesma consulta (antes eram duas, agora uma).
- **Cidade sem 404 no cabeçalho.** `localizar.ts` ganha `cidadeDoEnderecoOuNada`, que devolve `null` em vez de mandar para a página de não encontrado; `cidadeDoEndereco` passa a usá-la.
- **Texto num lugar só (RN-231).** `src/lib/cabecalho.ts`: `lugarDoCabecalho` e `letrasDaLinha` (as letras e os espaços da linha de baixo), testadas em `tests/unit/cabecalho.test.ts`.
- Sem banco, sem variável nova.

## Tarefas

- [x] T-260 `lugarDoCabecalho` e `letrasDaLinha` com testes (RN-231, RN-232) *(`tests/unit/cabecalho.test.ts`, 3 testes)*
- [x] T-261 DIGITAIS DO BRASIL de ponta a ponta abaixo da manchete, na capa e no cabeçalho menor (RF-230, RN-232) *(2026-11-16. Linha em Oswald seminegrito com 0,2 do tamanho da manchete, nunca menor que 0,6 rem. Folgas medidas na tinta das fontes carregadas, em em: C da Anton 0,031 à esquerda, S da Anton 0,0194 à direita, D da Oswald seminegrito 0,061 à esquerda, L 0,017 à direita; a manchete tem -0,01 em de espaçamento, que o navegador põe também depois do S. Conferido no navegador em 360, 375, 414, 768, 1024, 1440 e 1920 px na capa, e em 360 e 1440 px em `/entrar` (cabeçalho menor): a tinta de DIGITAIS começa e termina com a de CLASSIFICADOS, com diferença de até 0,01 px, e a página não rola para o lado)*
- [x] T-262 Rota paralela `@lugar` e a cidade na linha fina (RF-231, RN-230) *(2026-11-16. Conferido pelo HTML do servidor: capa, termos, como funciona e entrar com TODO O BRASIL; `/df/brasilia` e `/df/brasilia/veiculos` com BRASÍLIA · DF; `/sp/sao-jose-dos-campos` com SÃO JOSÉ DOS CAMPOS · SP; anúncio no ar com a cidade dele; anúncio que não existe com TODO O BRASIL; cidade que não existe e UF em maiúscula continuam dando 404. Na navegação sem recarregar (cidade → termos → capa → seção → anúncio), a cidade troca a cada clique. No celular de 360 px, a linha fina cabe numa linha com BRASÍLIA · DF; cidade de nome comprido quebra o nome em duas linhas, como já acontecia com "Digitais do Brasil")*
- [x] T-263 Testes, typecheck, build e conferência no `next dev` no celular e no computador *(324 testes, typecheck e `next build` passando)*
- [x] T-264 Publicar com o OK do Álvaro e conferir no ar *(2026-11-16, "Pode publicar". Commit `0f2c32f`, push às 21:49; deploy de produção pronto em cerca de 1 minuto, sem migration. Conferido no ar: capa, termos, como funciona e entrar com TODO O BRASIL; Brasília, Veículos de Brasília e o anúncio do Astra (`/anuncio/4DPUMX`) com BRASÍLIA · DF, todos 200; `/df/naoexiste` continua 404; link curto, sitemap e cartaz respondem. Captura do Astra no celular, no ar, com DIGITAIS DO BRASIL de ponta a ponta)*
- [x] T-265 Manchete grande 25% menor (RF-232) e conferência no celular e no computador *(2026-11-16, à noite. `clamp(3.4rem, 15.2vw, 13.5rem)` passou a `clamp(2.55rem, 11.4vw, 10.125rem)`. Medido no navegador: 162 px de letra e 875 px de largura no computador (antes 216 e 1167), 231 px de largura no celular de 375 px (antes 308). DIGITAIS DO BRASIL continua do C ao S, com diferença de até 0,01 px, em 360, 375, 414, 768, 1024, 1440, 1561 e 1920 px; no celular ela fica no mínimo de 0,6 rem. Sem rolagem para o lado. 324 testes, typecheck e build)*
- [x] T-266 Publicar o ajuste com o OK do Álvaro e conferir no ar *(2026-11-16, "Pode publicar". Commit `0ca676e`, push às 22:01 (levou junto `b86d834`, só de spec); deploy de produção pronto às 22:02, sem migration. Conferido no ar: capa, Brasília, Veículos de Brasília, anúncio do Astra e termos com o tamanho novo; Entrar com o cabeçalho menor de antes; os lugares (TODO O BRASIL e BRASÍLIA · DF) certos; `/df/naoexiste` 404; link curto, sitemap e cartaz respondem. Na capa no ar, em 1561 px: letra de 162 px, 875 px de largura, DIGITAIS DO BRASIL do C ao S)*
