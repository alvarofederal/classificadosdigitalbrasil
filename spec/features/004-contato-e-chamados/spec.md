# 004 · Contato e chamados

## Spec

**Problema.** Não há como tirar dúvida, reclamar de pagamento ou denunciar um anúncio.

| ID | Requisito |
|---|---|
| RF-60 | Formulário de contato na capa (seção *Contato*) e na página do anúncio ("Denunciar este anúncio"): nome, e-mail, telefone opcional, assunto, mensagem. |
| RF-61 | Assuntos: Dúvida, Suporte, Pagamento, Denúncia, Sugestão, Outro. Denúncia vem com o código do anúncio preenchido. |
| RF-62 | Ao enviar, a pessoa recebe um número de protocolo. |
| RF-63 | Painel → Chamados: lista com filtro por situação (abertos/resolvidos) e assunto, contato para responder, nota interna e botão "Marcar como resolvido". |
| RF-64 | O resumo do painel mostra quantos chamados estão abertos. |

| ID | Regra |
|---|---|
| RN-60 | E-mail obrigatório e válido; mensagem de 10 a 2.000 caracteres. |
| RN-61 | Freio contra robôs: campo-isca e no máximo 5 chamados do mesmo e-mail por hora. |

## Plano

Tabela `chamados` (protocolo de 8 letras). Domínio `domain/chamado/chamado.ts`. Casos de uso `AbrirChamado` e `ResolverChamado`. A resposta é feita pelo admin por e-mail ou WhatsApp; envio automático de e-mail fica para depois.

## Tarefas

- [x] T-60 Modelo e migração
- [x] T-61 Formulário de contato (capa e denúncia)
- [x] T-62 Painel → Chamados
