-- Feature 012 (ADR-17): aviso de vencimento por e-mail.
-- Coluna nova e opcional: os anúncios existentes ficam com NULL ("ainda não avisado"), sem perder nada.

-- AlterTable
ALTER TABLE `anuncios` ADD COLUMN `avisoDeVencimentoPara` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `anuncios_situacao_expiraEm_idx` ON `anuncios`(`situacao`, `expiraEm`);
