# 019 · Cartaz com VENDE-SE

*Item 5.4 do `08-lancamento.md`. Pergunta refeita com figura e aprovada pelo Álvaro em 2026-11-15.*

## Spec

**Problema.** O cartaz A4 do anúncio (`/cartaz/CODIGO`, feature 005) abre com "CLASSIFICADOS" no alto. Colado no vidro do carro ou num poste, ele não diz de cara o que é. A placa de rua que todo mundo reconhece diz VENDE-SE.

**Resposta do Álvaro.** "Ficou boa a ideia do vende-se, mas se não pegar, voltamos ao classificados no título do anúncio."

| ID | Requisito |
|---|---|
| RF-190 | O alto do cartaz traz uma palavra grande: VENDE-SE, ALUGA-SE ou CLASSIFICADOS. Com VENDE-SE ou ALUGA-SE, o nome do jornal, a cidade e a seção ficam numa linha menor logo abaixo. |
| RF-191 | Acima do cartaz, fora da impressão, quem vai imprimir escolhe a palavra. |

| ID | Regra |
|---|---|
| RN-190 | Já vem marcado VENDE-SE, menos em Empregos, Serviços, Festas e Eventos, Turismo e Lazer e Música, Arte e Cultura, onde vem CLASSIFICADOS. |
| RN-191 | A escolha só muda a impressão: vai no endereço (`?titulo=aluga-se`) e não fica gravada no anúncio. Valor desconhecido no endereço vale como o padrão da seção. |
| RN-192 | Para voltar ao cartaz antigo em todas as seções, basta trocar o padrão no catálogo do domínio (`tituloPadraoDoCartaz`). |

## Plano

- Domínio: `src/domain/anuncio/cartaz.ts` com o catálogo das palavras (Art. 2, O), o padrão por seção e a leitura do endereço.
- Apresentação: `src/app/cartaz/[codigo]/page.tsx` lê `?titulo`, monta o cabeçalho e mostra os três links de escolha com `print:hidden`. Sem JavaScript novo no navegador.
- Sem banco, sem ADR: não muda arquitetura.

## Tarefas

- [x] T-193 Domínio com testes (RN-190, RN-191) *(`tests/unit/cartaz.test.ts`)*
- [x] T-194 Cartaz com a palavra grande e a escolha (RF-190, RF-191) *(2026-11-15, conferido no `next dev` com os anúncios de demonstração num MariaDB local: Veículos abre com VENDE-SE, Serviços com CLASSIFICADOS, os três links trocam a palavra. Com VENDE-SE a foto passou de 80 mm para 72 mm de altura: medido com o texto e o título do Astra na largura da folha, o cartaz ocupa 1015 dos 1032 pontos de altura de um A4 com margem de 12 mm; com 80 mm passaria para uma segunda folha)*
- [ ] T-195 Publicar com o OK do Álvaro e conferir o cartaz do Astra
