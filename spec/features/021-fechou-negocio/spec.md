# 021 · Fechou negócio? ("Vendeu?")

*Pedida pelo Álvaro em 2026-11-16 ("Sim, nessa ordem"), como o segundo passo da missão (`07-insights.md` §4.4): provar que o site ajuda a pessoa a ganhar dinheiro.*

## Spec

**Problema.** O site conta visitas e mensagens, mas não sabe se o anúncio terminou em negócio. Sem isso não há como mostrar que o Classificados dá resultado, nem pedir depoimento, nem saber que seção funciona.

**Ideia.** Perguntar ao dono, no momento certo, se fechou negócio: no e-mail que avisa que o anúncio vai sair do caderno e na tela do anúncio em Minha conta. A pergunta é "Fechou negócio?", e não "Vendeu?", porque também serve para aluguel, serviço e emprego.

### Requisitos

| ID | Requisito |
|---|---|
| RF-210 | A tela do anúncio em Minha conta pergunta "Fechou negócio?" com três respostas: "Sim, pelo Classificados", "Sim, por outro lugar" e "Ainda não". |
| RF-211 | O e-mail do vencimento (feature 012) traz "Já fechou negócio? Conte pra gente", com o link para a pergunta. |
| RF-212 | Quem responde "sim" com o anúncio ainda no ar recebe a oferta de tirá-lo do caderno na hora (o botão Desativar da feature 014). |
| RF-213 | O Painel mostra quantos negócios foram fechados pelo Classificados, por outro lugar e quantos ainda não, e a resposta na tela de cada anúncio. |

### Regras

| ID | Regra |
|---|---|
| RN-210 | Só se pergunta sobre anúncio que já esteve no caderno e não foi removido. |
| RN-211 | Só o dono responde. A resposta fica gravada no anúncio, com a data, e pode ser mudada; vale a última. |
| RN-212 | Responder não muda a situação do anúncio: tirar do caderno é uma escolha à parte (RF-212). |

### Critérios de aceite

- No anúncio no ar, a pergunta aparece; respondendo "Sim, pelo Classificados", fica marcado e aparece o botão para tirar do caderno.
- O e-mail do vencimento traz o link para a pergunta.
- O Painel conta a resposta.

## Plano

- Domínio `src/domain/anuncio/resultado.ts`: catálogo das respostas (Art. 2) e `podePerguntarResultado` (RN-210).
- Porta: `AnuncioRepository.registrarResultado(anuncioId, resultado, quando)`; caso de uso `RegistrarResultadoUseCase` (RN-211).
- Banco (migration `20261116120000_resultado_do_anuncio`): `anuncios.resultado` (ENUM, nulo = sem resposta) e `anuncios.resultadoEm`.
- Consultas: o detalhe do anúncio leva a resposta; o resumo do Painel conta as respostas.
- E-mail do vencimento: uma linha com o link `…/minha-conta/anuncios/ID#fechou-negocio` (`EnderecosDoSite.resultadoDoAnuncio`).
- Sem ADR: não muda a arquitetura.

## Tarefas

- [x] T-230 Domínio, porta, caso de uso e testes (RN-210, RN-211) *(`tests/unit/resultado.test.ts`, 4 testes)*
- [x] T-231 Migration, repositório e consultas (RF-213) *(migration `20261116120000_resultado_do_anuncio`)*
- [x] T-232 Pergunta na tela do anúncio e oferta de tirar do caderno (RF-210, RF-212)
- [x] T-233 Linha no e-mail do vencimento (RF-211) e números no Painel (RF-213) *(o teste da carta do vencimento passou a conferir a linha nova)*
- [x] T-234 Testes, typecheck, build e telas num banco local *(2026-11-16: 303 testes, typecheck e build. No `next dev` com MariaDB local: a pergunta aparece no anúncio no ar; "Sim, pelo Classificados" ficou gravado com a data e trouxe o botão Desativar; o Painel passou a contar 1 negócio pelo Classificados. Sem erro no servidor)*
- [x] T-235 Publicar com o OK do Álvaro *(2026-11-16, 10:12: "Pode publicar". Push de `e27abd8` a `4f796f2`; o deploy aplicou a migration `20261116120000_resultado_do_anuncio`. O e-mail de vencimento do Astra, esperado para 17/11 às 9h, já sai com a pergunta)*
