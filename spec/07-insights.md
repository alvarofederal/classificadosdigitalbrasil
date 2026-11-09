# 07 · Insights

## O que a versão 0.1 decidiu (2026-11-08)

- **Nome**: Classificados Digitais do Brasil.
- **Preço**: R$ 1,00 por 7 dias, um único plano, configurável no painel. O plano de 30 dias e o preço do álbum ficaram de fora; o álbum (até 6 fotos) está incluído no R$ 1,00 por enquanto.
- **Visual**: retângulos em colunas de jornal (não mais quadrados iguais), todos na mesma cor, com formatação escolhida pelo anunciante.
- **Seções**: as 18 categorias do ClassificadosCB, editáveis no painel.
- **Busca**: sempre UF + cidade + seção, cada combinação com endereço próprio.
- **Pagamento**: Pix estático com identificador e confirmação manual no painel (ADR-07). Sem taxa de gateway sobre o R$ 1,00.
- **Mensagem**: interna, por modal, sem cadastro de quem procura.

## O que a versão 0.2 decidiu (2026-11-09)

- **Primeira visita**: a capa explica antes de mostrar (como funciona, valores, contato) e não lista seções vazias. A localização do navegador leva ao caderno da cidade.
- **Planos**: Simples R$ 1/R$ 3, Com fotos R$ 3/R$ 9, Destaque R$ 5/R$ 15, Vitrine R$ 10/R$ 30 (7/30 dias, mês = 3 semanas). Proposta inicial; o Álvaro ajusta em Painel → Planos.
- **Boca a boca**: cada anúncio é uma página própria para divulgar. Melhorias sobre a ideia original: link curto, prévia de recorte de jornal no WhatsApp, botões de compartilhar, **cartaz A4 com QR Code** (o anúncio sai da tela e vai para o vidro do carro, o mural da igreja e a padaria), contador de visitas para o dono e o convite "Anuncie você também" no rodapé de todo anúncio.
- **Escala do pagamento**: Pix confirmado pelo gateway (Mercado Pago, 0,99%), sem ninguém validar à mão. O anúncio do Gol é o primeiro exemplo da plataforma, publicado como cortesia.

## Próximos passos sugeridos

1. Ligar o Mercado Pago e fazer um Pix real de R$ 1,00 (feature 006, T-84).
2. Créditos (carteira) para renovar com um clique.
3. E-mail de "seu anúncio vence amanhã" e de "nova mensagem".
4. "Subir para o topo" por um valor pequeno.
5. Rodar o teste de carga num ambiente de teste (feature 008).

---

# A ideia original (2026-11-07)

Rascunho de 2026-11-07, antes da versão 0.1.

## 1. Em uma frase

Um mural de classificados por cidade, com a diagramação do caderno de classificados do jornal: quadrados do mesmo tamanho, lado a lado, pagos por semana com valores pequenos via Pix.

## 2. Como funciona (como você descreveu)

### Quem procura

1. Abre a página: título **Classificados Digital** centralizado.
2. Logo abaixo: escolhe a **UF**, depois a **Cidade**, e clica em **Pesquisar**.
3. O sistema busca no banco os anúncios ativos daquela cidade e mostra a grade de quadrados.
4. Cada quadrado tem o texto do anúncio e, embaixo de tudo, um botão pequeno de **mensagem** e um ícone de **álbum** quando o anunciante subiu fotos.

```
┌──────────────────────────┐
│ VENDO GOL 2010           │
│ Completo, 4 portas,      │
│ revisado, IPVA pago.     │
│ R$ 22.000 · Centro       │
│                          │
│ [✉ Mensagem]     [▣ 6]   │
└──────────────────────────┘
```

### Quem anuncia

1. Faz o cadastro pessoal uma vez, com os dados pessoais.
2. Depois pode publicar quantos anúncios quiser. Cada um é pago pelo espaço (tamanho) e pelo período.
3. Opcional: álbum com até 6 fotos.

### Preços que você propôs

| Item | 7 dias | 30 dias |
|---|---|---|
| Quadrado simples | R$ 1 | R$ 30 |
| Quadrado duplo | R$ 2 | não definido |
| Álbum de 6 fotos | R$ 10 | R$ 300 |

Objetivo de negócio: muitos pagamentos pequenos e rápidos.

## 3. Insights

### 3.1 O preço de 30 dias está invertido

Esse é o ponto mais importante para corrigir antes de construir.

- Quadrado simples: 7 dias por R$ 1 dá **R$ 0,14 por dia**. 30 dias por R$ 30 dá **R$ 1,00 por dia**, sete vezes mais caro.
- Quem fizer a conta compra 5 semanas avulsas (35 dias por R$ 5) em vez de 30 dias por R$ 30. O plano mensal nunca vai vender.
- O mesmo vale para o álbum: R$ 300 por 30 dias contra R$ 40 em 4 semanas avulsas.

O normal é o contrário: o período longo sai mais barato por dia, porque você recebe adiantado e o anunciante não precisa renovar toda semana. Uma regra simples de comunicar é **"mês = 3 semanas"**:

| Item | 7 dias | 30 dias (regra "mês = 3 semanas") |
|---|---|---|
| Quadrado simples | R$ 1 | R$ 3 |
| Quadrado duplo | R$ 2 | R$ 6 |
| Álbum de 6 fotos | R$ 10 | R$ 30 |

Se a intenção era **R$ 1 por dia**, a tabela consistente seria 7 dias por R$ 7 e 30 dias por R$ 30. Funciona, mas R$ 7 deixa de ser o pagamento pequeno que é a graça da ideia. Minha sugestão é manter R$ 1 por semana.

### 3.2 A taxa do Pix pode comer o R$ 1 inteiro

Para o sistema confirmar o pagamento sozinho (o anúncio entra no ar na hora), é preciso cobrar por um gateway com QR Code dinâmico e aviso automático (webhook). É justamente nesse tipo de cobrança que as plataformas cobram taxa, e o formato da taxa decide se o R$ 1 dá lucro:

| Tipo de taxa | Exemplo | Resultado num anúncio de R$ 1 |
|---|---|---|
| Fixa por cobrança | Asaas informa R$ 0,99 nos 3 primeiros meses e R$ 1,99 depois | prejuízo de até R$ 0,99 |
| Percentual | Mercado Pago aparece com cerca de 0,99% em vendas online | custo de R$ 0,01 |

As tabelas mudam e as fontes divergem: conferir na página oficial de cada gateway antes de escolher.

Duas saídas, que podem andar juntas:

1. **Gateway com taxa só percentual** para o Pix.
2. **Créditos (carteira)**: o anunciante coloca R$ 10 ou R$ 20 de uma vez via Pix e cada anúncio ou renovação desconta do saldo na hora. Uma taxa a cada dez anúncios em vez de uma por anúncio, e a renovação vira um clique, sem abrir o app do banco. É o modelo que mais combina com "pagamentos pequenos e muito rápidos".

Para renovação mensal automática existe o Pix Automático (em vigor desde 2025). Ver se o gateway escolhido oferece.

### 3.3 A conta da receita: precisa de volume, e o álbum carrega

Simulação com **100 anúncios ativos por semana**, numa mistura suposta de 70 simples, 20 duplos e 10 simples com álbum, nos seus preços de 7 dias:

| Parte | Por semana |
|---|---|
| 70 simples × R$ 1 | R$ 70 |
| 20 duplos × R$ 2 | R$ 40 |
| 10 simples com álbum × (R$ 1 + R$ 10) | R$ 110 |
| **Total** | **R$ 220** (cerca de R$ 950 por mês) |

Leituras:

- Com R$ 1 por semana, cada R$ 1.000 por mês pede algo como 100 anúncios ativos o tempo todo. 1.000 anúncios ativos dão perto de R$ 9.500 por mês.
- Metade da receita vem do álbum. O preço do álbum é a decisão de preço que mais pesa.
- Contraponto: foto é o que mais vende em classificado online. Se o álbum for caro e pouca gente comprar, a grade fica pobre e o comprador some. Vale testar R$ 3 ou R$ 5 por semana e medir quantos compram.

### 3.4 Cidade vazia: o problema do ovo e da galinha

É o maior risco da ideia. Quem procura numa cidade sem anúncios não volta; quem anuncia não paga para um mural sem visitas.

- **Começar por uma cidade só**, onde você tem rede (igreja, amigos, clientes). O Igor Veículos pode ser o primeiro anunciante, com os carros dele em quadrados.
- **Primeira semana grátis** para quem se cadastra, só na cidade piloto, para encher a grade no começo.
- **Cidade vazia não pode ser tela em branco**: mostrar "Ainda não há anúncios em <cidade>. Anuncie aqui por R$ 1" e, abaixo, os anúncios mais recentes de outras cidades da mesma UF.

### 3.5 Por que alguém paga R$ 1 se OLX e Marketplace são grátis

O pagamento é parte do produto, não só a receita:

- **Filtro de spam e golpe**: anúncio pago e cadastro com dados pessoais afastam perfil falso e anúncio fantasma. Dá para dizer isso na página.
- **Leitura rápida**: todos os quadrados do mesmo tamanho, sem algoritmo decidindo quem aparece. Bate o olho e lê a página inteira, como no jornal.
- **Local de verdade**: a busca começa pela cidade.

Público que mais combina: **prestador de serviço** (diarista, pedreiro, frete, aula particular, manicure, conserto), "aluga-se" e "contrata-se". Era a alma do classificado de jornal, é mal atendido pela OLX e pelo Marketplace, e **renova todo mês**. Quem vende um produto anuncia uma vez; o prestador de serviço vira receita recorrente.

### 3.6 O "tamanho exato do jornal" na tela

No jornal o espaço é vendido por coluna e centímetro de altura. Na tela, tamanho físico não se mantém: o mesmo quadrado tem 3 cm no celular e 6 cm no monitor. O que dá para manter idêntico é:

- **A proporção do quadrado** e a **grade de colunas**: algo como 6 colunas no computador (página de jornal), 4 no tablet e 2 no celular.
- **O limite de texto**, que é o que faz todos os quadrados ficarem iguais. Proposta inicial: título curto em caixa alta (até uns 25 caracteres, como "VENDO GOL 2010") e texto de até uns 140 caracteres no simples; o duplo ocupa duas colunas e aceita o dobro de texto.
- **A tipografia de jornal**: fonte serifada, texto compacto, fios finos separando os quadrados.

No celular, o duplo ocupa a largura toda.

### 3.7 Ordem dos quadrados

Com todos do mesmo tamanho, a posição na grade é o que diferencia. No jornal a ordem era por seção e alfabética. Proposta: **mais recentes primeiro**, o que premia quem renova. "Subir para o topo" ou "destaque" pode ser um adicional pago depois (ver seção 4).

### 3.8 A busca por cidade como página própria

Em vez de a busca só devolver resultados na mesma tela, cada cidade vira um endereço: `/df/brasilia`, `/sp/campinas`. Isso dá três coisas de graça:

- O Google indexa "classificados em <cidade>" para cada uma das 5.570 cidades.
- Dá para mandar o link da cidade no WhatsApp.
- O navegador lembra a última cidade escolhida.

Cada anúncio também ganha página e link próprios, com a imagem do quadrado no formato de recorte de jornal quando compartilhado no WhatsApp. O anunciante divulga o próprio anúncio nos grupos dele, e isso traz visita para o mural.

### 3.9 Mensagem: como o comprador fala com o anunciante

Opções:

1. **Mensagem interna**: o comprador escreve nome, contato e texto; chega na caixa do anunciante e por e-mail. Não expõe o telefone. O portfólio já tem um formulário de contato com caixa de mensagens que serve de modelo.
2. **Botão de WhatsApp** do anunciante: mais simples, mas expõe o número.
3. As duas, com o anunciante escolhendo se mostra o WhatsApp.

Sugestão para começar: a 1, com o comprador **sem cadastro** (só nome e contato), para não criar atrito do lado de quem procura.

### 3.10 Cadastro, dados pessoais e confiança

- Guardar só o necessário: nome, CPF, e-mail, celular e cidade. O CPF serve para uma conta por pessoa e para conferência contra fraude; nunca aparece no anúncio.
- Confirmar e-mail no cadastro (grátis). Confirmação por SMS ou WhatsApp custa por envio.
- Política de privacidade e termos de uso desde o primeiro dia (LGPD).
- O Marco Civil da Internet (art. 15) obriga quem explora o site como empresa a guardar os registros de acesso por 6 meses.

### 3.11 Moderação

Anúncio pago não é anúncio aprovado. Desde o início:

- Lista do que é proibido (armas, remédios controlados, animais silvestres etc.) nos termos de uso.
- Botão **Denunciar** em cada quadrado.
- Painel para você tirar um anúncio do ar, com regra clara de reembolso.

### 3.12 Expiração não precisa de agendador

O anúncio sai do ar sozinho se a busca filtrar pela data: só aparece o que tem `expira_em` maior que agora. Não depende de cron. O agendador só é necessário para o e-mail de "seu anúncio vence amanhã, renove por R$ 1", e o cron de 1 vez por dia do plano gratuito da Vercel basta para isso.

### 3.13 Formalização

- Vários gateways aceitam conta com CPF, o que permite começar o piloto sem CNPJ. Com volume, abrir CNPJ e ver com contador qual atividade (CNAE) e enquadramento cabem, inclusive se MEI serve.
- Créditos comprados pela internet: prever reembolso de saldo não usado no prazo de 7 dias (CDC, art. 49).
- Se a nomeação no concurso vier: a Lei 8.112 (art. 117, X) proíbe o servidor de participar da gerência ou administração de sociedade privada e de exercer o comércio, exceto como acionista, cotista ou comanditário. Isso pesa na escolha de como e em nome de quem a empresa é aberta.

## 4. Ideias guardadas para depois

Fora do primeiro lançamento, para não atrasar o básico:

- **Destaque**: borda, negrito ou fundo de cor no quadrado.
- **Subir para o topo** por um valor pequeno (R$ 0,50).
- **Categorias** (Imóveis, Veículos, Empregos, Serviços, Diversos) como segundo filtro depois da cidade.
- **Plano mensal do prestador de serviço**, com renovação automática.
- **Página do anunciante** com todos os anúncios dele.
- **Edição da semana**: uma imagem ou PDF com os classificados da cidade, no formato de página de jornal, para circular nos grupos de WhatsApp.

## 5. Decisões para amanhã

1. Preço de 30 dias: regra "mês = 3 semanas" ou outra?
2. Álbum: fica em R$ 10 por semana ou testa um valor menor? É sempre um adicional ao quadrado?
3. Quadrado duplo: duas colunas (horizontal) ou duas alturas (vertical)?
4. Pagamento: créditos (carteira), Pix por anúncio, ou os dois?
5. Mensagem: interna, WhatsApp ou as duas? O comprador precisa de cadastro?
6. Categorias já no primeiro lançamento?
7. Cidade piloto.
8. Nome e domínio: a pasta está como `classificadodigital` (singular) e a marca como "Classificados Digital" (plural com singular). Fechar a grafia antes de registrar o domínio.

## 6. Esboço técnico (para a geração do sistema)

- **Base**: `projetobase` (Next.js), no molde `spec/` do Igor Veículos e do portfólio. Postgres com Prisma, deploy na Vercel. Banco e segredos novos, sem reaproveitar o `.env` do projetobase.
- **UF e cidades**: lista de municípios da API do IBGE (`servicodados.ibge.gov.br`), baixada uma vez e guardada como JSON no projeto, para a tela não depender da API do IBGE para funcionar.
- **Fotos**: compressão para WebP no navegador antes do upload; armazenamento a escolher (Vercel Blob, Cloudinary ou Cloudflare R2).
- **Pagamento**: gateway com Pix por QR Code dinâmico e webhook; o anúncio é publicado quando o webhook confirma.
- **Entidades iniciais**: Usuário, Anúncio (tamanho, título, texto, UF, código IBGE da cidade, início, expiração, situação), Foto, Pagamento, Crédito (se houver carteira), Mensagem, Denúncia.

## Fontes consultadas sobre taxas de Pix

- [Asaas: Pix cobra taxa?](https://blog.asaas.com/pix-cobra-taxa)
- [Asaas: Pix no Asaas](https://asaas.com/pix-asaas)
- [Nuvemshop: quanto a PJ paga para usar o Pix em 2026](https://www.nuvemshop.com.br/blog/pix-pessoa-juridica/)
- [Tecnoblog: tarifas de Pix para PJ nos bancos](https://tecnoblog.net/noticias/pix-itau-bradesco-e-bb-cobram-ate-r-150-de-clientes-pj-veja-tarifas/)
