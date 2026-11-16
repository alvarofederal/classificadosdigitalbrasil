-- Feature 016 (ADR-20): código por e-mail para confirmar o cadastro, trocar o e-mail e criar senha nova.

-- AlterTable
ALTER TABLE `usuarios` ADD COLUMN `emailCanonico` VARCHAR(160) NOT NULL DEFAULT '',
    ADD COLUMN `emailConfirmadoEm` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `codigos_por_email` (
    `id` VARCHAR(191) NOT NULL,
    `usuarioId` VARCHAR(191) NOT NULL,
    `finalidade` ENUM('CADASTRO', 'TROCA_DE_EMAIL', 'NOVA_SENHA') NOT NULL,
    `email` VARCHAR(160) NOT NULL,
    `codigoHash` CHAR(64) NOT NULL,
    `tentativas` INTEGER NOT NULL DEFAULT 0,
    `expiraEm` DATETIME(3) NOT NULL,
    `encerradoEm` DATETIME(3) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `codigos_por_email_usuarioId_finalidade_criadoEm_idx`(`usuarioId`, `finalidade`, `criadoEm`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `usuarios_emailCanonico_idx` ON `usuarios`(`emailCanonico`);

-- RN-154: as contas que já existiam contam como confirmadas.
UPDATE `usuarios` SET `emailConfirmadoEm` = `criadoEm` WHERE `emailConfirmadoEm` IS NULL;

-- RN-155: e-mail canônico das contas existentes, a mesma regra de `emailCanonico` em src/domain/usuario/codigo-por-email.ts:
-- sem o que vem depois do "+" (quando há algo antes dele) e, no Gmail, sem pontos e com o domínio gmail.com.
UPDATE `usuarios` SET `emailCanonico` = CONCAT(
  IF(SUBSTRING_INDEX(LOWER(TRIM(`email`)), '@', -1) IN ('gmail.com', 'googlemail.com'), REPLACE(IF(LOCATE('+', SUBSTRING_INDEX(LOWER(TRIM(`email`)), '@', 1)) > 1, SUBSTRING_INDEX(SUBSTRING_INDEX(LOWER(TRIM(`email`)), '@', 1), '+', 1), SUBSTRING_INDEX(LOWER(TRIM(`email`)), '@', 1)), '.', ''), IF(LOCATE('+', SUBSTRING_INDEX(LOWER(TRIM(`email`)), '@', 1)) > 1, SUBSTRING_INDEX(SUBSTRING_INDEX(LOWER(TRIM(`email`)), '@', 1), '+', 1), SUBSTRING_INDEX(LOWER(TRIM(`email`)), '@', 1))),
  '@',
  IF(SUBSTRING_INDEX(LOWER(TRIM(`email`)), '@', -1) IN ('gmail.com', 'googlemail.com'), 'gmail.com', SUBSTRING_INDEX(LOWER(TRIM(`email`)), '@', -1))
);
