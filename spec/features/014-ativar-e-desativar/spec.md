# 014 · Ativar e desativar o anúncio

## Spec

**Problema.** Hoje o anunciante só tem duas saídas para tirar o anúncio do caderno: esperar o prazo acabar ou remover, e remover é para sempre (só o administrador restaura). Quem vendeu o carro mas ainda vai conversar com um comprador, ou viajou e não quer receber mensagens, não tem como tirar o anúncio do ar por uns dias e voltar depois. Pedido do Álvaro em 2026-11-12: "um botão de ativar e desativar, para o status do anúncio".

**Quem usa.** O anunciante, na tela do anúncio em Minha conta; o administrador, na tela do anúncio no Painel.

| ID | Requisito |
|---|---|
| RF-140 | Na tela do anúncio em Minha conta, o anúncio no ar tem o botão **Desativar anúncio**, e o desativado tem o botão **Ativar anúncio**, que o põe de volta no caderno. A tela explica, perto do botão, o que acontece. |
| RF-141 | A situação **Desativado** aparece no selo do anúncio, na lista de Minha conta e no Painel. O Painel filtra por ela e tem os mesmos dois botões na tela do anúncio. |

| ID | Regra |
|---|---|
| RN-140 | Desativado é fora do caderno: não aparece na seção nem no sitemap, a página pública diz que está fora do ar, não recebe mensagem e não conta visita. O texto, as fotos, as visitas e o histórico de pagamentos ficam como estão. |
| RN-141 | O prazo pago continua correndo enquanto o anúncio está desativado. Desativar não guarda dias. Ativar devolve o anúncio ao caderno até a mesma data de antes. |
| RN-142 | Só se desativa anúncio no ar, e só se ativa anúncio desativado com prazo. O desativado cujo prazo acabou aparece como **Expirado** e volta pela renovação, como qualquer anúncio expirado. |
| RN-143 | Pagar a renovação de um anúncio desativado, ou receber a cortesia do administrador, põe o anúncio no ar. Os dias somam ao fim atual se ele ainda não passou (RN-12), como no anúncio no ar. |
| RN-144 | Anúncio desativado não recebe o e-mail "seu anúncio sai do caderno amanhã" (feature 012). |
| RN-145 | O dono e o administrador desativam e ativam. Anúncio removido ou aguardando o primeiro pagamento não se desativa nem se ativa. |

**Aceite.** O Astra no ar: o Álvaro clica em *Desativar anúncio* e confirma. O selo vira *Desativado*, a seção de Veículos de Brasília deixa de mostrar o anúncio, o link `/a/4DPUMX` mostra a página de fora do ar e a data do fim continua a mesma. Ele clica em *Ativar anúncio* e o anúncio volta à seção, no ar até a mesma data.

**Decisão tomada sem perguntar (o Álvaro pode mudar).** O prazo corre durante a desativação (RN-141). É o mais simples de entender e não muda os preços: o plano paga dias de calendário, como hoje. A outra opção, congelar os dias restantes, fica anotada como ideia.

## Plano

Sem ADR: é uma situação nova no ciclo de vida do anúncio, sem mudar camadas nem provedores.

- **Domínio** (`domain/anuncio/anuncio.ts`): `DESATIVADO` em `SITUACOES` e em `SITUACOES_EXIBIDAS`. `situacaoExibida` devolve `DESATIVADO` dentro do prazo e `EXPIRADO` depois dele. `podeDesativar` e `podeAtivar` dizem quando cada botão vale (RN-142, RN-145).
- **Aplicação** (`use-cases/anuncios/gerenciar-anuncios.ts`): `DesativarAnuncioUseCase` e `AtivarAnuncioUseCase`, com `podeMexer` (dono ou admin). `ConfirmarPagamentoUseCase` passa a somar os dias ao fim atual também do desativado (RN-143).
- **Banco**: migration `20261112200000_anuncio_desativado` acrescenta `DESATIVADO` ao enum `situacao` de `anuncios`. As consultas públicas já pedem `situacao = PUBLICADO` e prazo no futuro (`noAr`), então o desativado sai sozinho da seção, do sitemap, da página pública, das mensagens, das visitas e do aviso de vencimento. O filtro do Painel ganha `DESATIVADO`; `EXPIRADO` passa a incluir o desativado com prazo vencido.
- **Telas**: `BotaoAtivarDesativar` em Minha conta, ao lado de *Remover anúncio*, e no quadro *Situação* do Painel; selo com o estilo do desativado; frase "Desativado. Volta ao caderno quando você ativar, até DD/MM" na tela e na lista.

## Tarefas

- [x] T-170 Spec, plano e tarefas (este arquivo)
- [x] T-171 Domínio e testes (RN-141, RN-142, RN-145)
- [x] T-172 Casos de uso e testes, inclusive a renovação do desativado (RN-143)
- [x] T-173 Migration do enum e filtro do Painel
- [x] T-174 Telas: botão, selo e textos em Minha conta e no Painel
- [x] T-175 Testes, typecheck e build *(239 testes; telas não conferidas num banco local)*
- [ ] T-176 Publicar e conferir em produção com o Álvaro
