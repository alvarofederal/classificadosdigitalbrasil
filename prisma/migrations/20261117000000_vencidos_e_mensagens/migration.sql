-- Feature 018 (ADR-24): vencidos guardados por 180 dias e mensagens por 90.
-- Só acrescenta: o valor APAGADO no enum e duas colunas opcionais. Nenhuma linha muda; a primeira limpeza é feita pela
-- rodada diária (/api/tarefas/vencidos), não por esta migration.

-- AlterTable
ALTER TABLE `anuncios` ADD COLUMN `apagadoEm` DATETIME(3) NULL,
    ADD COLUMN `avisoDeApagarPara` DATETIME(3) NULL,
    MODIFY `situacao` ENUM('AGUARDANDO_PAGAMENTO', 'PUBLICADO', 'DESATIVADO', 'REMOVIDO', 'APAGADO') NOT NULL DEFAULT 'AGUARDANDO_PAGAMENTO';
