-- Feature 015 (ADR-22): convites de cortesia.

-- AlterTable
ALTER TABLE `configuracoes` ADD COLUMN `convitesLigados` BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE `convites` (
    `id` VARCHAR(191) NOT NULL,
    `convidanteId` VARCHAR(191) NOT NULL,
    `canal` ENUM('EMAIL', 'WHATSAPP') NOT NULL,
    `emailDestino` VARCHAR(160) NULL,
    `codigoHash` CHAR(64) NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiraEm` DATETIME(3) NOT NULL,
    `aceitoPorId` VARCHAR(191) NULL,
    `aceitoEm` DATETIME(3) NULL,
    `premiadoEm` DATETIME(3) NULL,
    `canceladoEm` DATETIME(3) NULL,

    UNIQUE INDEX `convites_codigoHash_key`(`codigoHash`),
    UNIQUE INDEX `convites_aceitoPorId_key`(`aceitoPorId`),
    INDEX `convites_convidanteId_criadoEm_idx`(`convidanteId`, `criadoEm`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

