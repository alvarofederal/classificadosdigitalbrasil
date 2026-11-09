-- AlterTable
ALTER TABLE `anuncios` ADD COLUMN `planoCodigo` VARCHAR(20) NOT NULL DEFAULT 'SIMPLES',
    ADD COLUMN `prioridade` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `visualizacoes` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `pagamentos` ADD COLUMN `copiaECola` TEXT NULL,
    ADD COLUMN `gateway` VARCHAR(20) NULL,
    ADD COLUMN `gatewayId` VARCHAR(64) NULL,
    ADD COLUMN `planoCodigo` VARCHAR(20) NOT NULL DEFAULT 'SIMPLES',
    ADD COLUMN `vencimentoEm` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `configuracoes` DROP COLUMN `diasDePublicacao`,
    DROP COLUMN `valorAnuncio`;

-- CreateTable
CREATE TABLE `planos` (
    `codigo` VARCHAR(20) NOT NULL,
    `nome` VARCHAR(40) NOT NULL,
    `descricao` VARCHAR(200) NOT NULL,
    `maxFotos` INTEGER NOT NULL,
    `valor7Dias` DECIMAL(10, 2) NOT NULL,
    `valor30Dias` DECIMAL(10, 2) NOT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `atualizadoEm` DATETIME(3) NOT NULL,

    PRIMARY KEY (`codigo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chamados` (
    `id` VARCHAR(191) NOT NULL,
    `protocolo` CHAR(8) NOT NULL,
    `nome` VARCHAR(80) NOT NULL,
    `email` VARCHAR(160) NOT NULL,
    `telefone` VARCHAR(20) NOT NULL DEFAULT '',
    `assunto` ENUM('DUVIDA', 'SUPORTE', 'PAGAMENTO', 'DENUNCIA', 'SUGESTAO', 'OUTRO') NOT NULL,
    `mensagem` TEXT NOT NULL,
    `anuncioCodigo` CHAR(6) NULL,
    `situacao` ENUM('ABERTO', 'RESOLVIDO') NOT NULL DEFAULT 'ABERTO',
    `notaInterna` TEXT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolvidoEm` DATETIME(3) NULL,

    UNIQUE INDEX `chamados_protocolo_key`(`protocolo`),
    INDEX `chamados_situacao_criadoEm_idx`(`situacao`, `criadoEm`),
    INDEX `chamados_email_criadoEm_idx`(`email`, `criadoEm`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `anuncios_planoCodigo_situacao_expiraEm_idx` ON `anuncios`(`planoCodigo`, `situacao`, `expiraEm`);

-- CreateIndex
CREATE INDEX `pagamentos_gatewayId_idx` ON `pagamentos`(`gatewayId`);

