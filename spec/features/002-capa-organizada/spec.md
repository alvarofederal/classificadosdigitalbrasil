# 002 · Capa organizada

## Spec

**Problema.** Quem chega pela primeira vez vê 18 seções vazias e não entende o que é o site nem quanto custa. "Nunca mais volto."

**Quem usa.** Visitante de primeira vez (procura ou quer anunciar).

| ID | Requisito |
|---|---|
| RF-40 | A capa é limpa: manchete e o filtro Estado → Cidade → Seção → Pesquisar, com o link discreto "Anúncios perto de mim". Nada mais (revisão pedida em 2026-11-09). |
| RF-48 | `/como-funciona` é a página de divulgação da plataforma, com link próprio para propaganda: abertura com chamada, por que anunciar, para quem anuncia, para quem procura, valores, perguntas frequentes, contato e botões para compartilhar a página; prévia própria no WhatsApp. O cabeçalho e o rodapé levam a ela. |
| RF-41 | "Anúncios perto de mim" pede a localização ao navegador e abre o caderno da cidade mais próxima. |
| RF-42 | Se a permissão de localização já foi dada antes, a capa mostra direto o atalho para a cidade (sem perguntar de novo). Se foi negada, só a busca manual aparece. |
| RF-43 | A última cidade visitada fica guardada no navegador e aparece como atalho "Continuar em Brasília/DF". |
| RF-44 | *Como funciona* explica em passos curtos para quem anuncia e para quem procura. |
| RF-45 | *Valores* mostra a tabela de planos vigente (feature 003). |
| RF-46 | *Contato* tem o formulário de chamados (feature 004). |
| RF-47 | ~~Vitrine na capa~~ suspensa em 2026-11-09: volta quando houver anunciantes de verdade. O plano Vitrine está fora de venda. |

| ID | Regra |
|---|---|
| RN-40 | A localização (latitude e longitude) não é gravada nem enviada a terceiros: o servidor só calcula a cidade mais próxima e responde. |
| RN-41 | Coordenada fora do Brasil (ou inválida) responde "não encontramos sua cidade" e mantém a busca manual. |

**Aceite.** Primeira visita: a capa cabe em poucas rolagens, sem seções vazias. Clicar em "Anúncios perto de mim" em Brasília leva a `/df/brasilia`.

## Plano

- Coordenadas dos 5.571 municípios: base pública *kelvins/municipios-brasileiros* (código IBGE, latitude, longitude), juntada ao JSON do IBGE por `scripts/gerar-municipios.mjs`. Formato do servidor passa a `[código, nome, slug, lat, lng]`. O JSON público por UF não muda.
- Domínio: `domain/localidade/geo.ts` (distância de Haversine, caixa do Brasil). Porta `Localidades.cidadeMaisProxima(lat, lng)`.
- Apresentação: componente cliente `PertoDeMim` (API de geolocalização do navegador + `navigator.permissions`), Server Action `cidadeMaisProximaAction`. `localStorage` só guarda a última cidade.
- ADR-11: capa sem consulta de anúncios por seção; a única consulta nacional é a vitrine, limitada a 10 e por índice de plano.

## Tarefas

- [x] T-40 Coordenadas no gerador de municípios e no catálogo
- [x] T-41 `cidadeMaisProxima` com teste
- [x] T-42 Componente "Anúncios perto de mim" e atalho da última cidade
- [x] T-43 Capa nova com busca, perto de mim e vitrine
- [x] T-44 Página /como-funciona com funcionamento, valores, perguntas frequentes e contato
