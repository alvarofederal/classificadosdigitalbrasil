-- Feature 017 (ADR-21): banco de dias, presente de boas-vindas e tabela proporcional.

-- AlterTable
ALTER TABLE `usuarios` ADD COLUMN `bancoDiasFotos` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `bancoDiasSimples` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `ipDoCadastro` VARCHAR(64) NULL,
    ADD COLUMN `presenteEm` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `configuracoes` ADD COLUMN `presenteLigado` BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE `movimentos_do_banco` (
    `id` VARCHAR(191) NOT NULL,
    `usuarioId` VARCHAR(191) NOT NULL,
    `planoCodigo` VARCHAR(20) NOT NULL,
    `dias` INTEGER NOT NULL,
    `motivo` ENUM('BOAS_VINDAS', 'USO', 'DEVOLUCAO', 'CONVITE', 'COMPRA', 'CORTESIA') NOT NULL,
    `anuncioId` VARCHAR(191) NULL,
    `pagamentoId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `movimentos_do_banco_usuarioId_criadoEm_idx`(`usuarioId`, `criadoEm`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `usuarios_ipDoCadastro_criadoEm_idx` ON `usuarios`(`ipDoCadastro`, `criadoEm`);

-- RN-175: as contas de anunciante que já existiam, ativas, confirmadas e sem e-mail de teste (RN-122),
-- recebem o presente de boas-vindas: 7 dias sem foto e 7 com foto, com a entrada no extrato.
INSERT INTO `movimentos_do_banco` (`id`, `usuarioId`, `planoCodigo`, `dias`, `motivo`, `criadoEm`)
SELECT CONCAT('presente-simples-', `id`), `id`, 'SIMPLES', 7, 'BOAS_VINDAS', UTC_TIMESTAMP(3) FROM `usuarios`
WHERE `perfil` = 'ANUNCIANTE' AND `ativo` = 1 AND `emailConfirmadoEm` IS NOT NULL AND `presenteEm` IS NULL
  AND LOWER(`email`) NOT REGEXP '(\.(test|example|invalid|localhost)|[@.]example\.(com|net|org))$';

INSERT INTO `movimentos_do_banco` (`id`, `usuarioId`, `planoCodigo`, `dias`, `motivo`, `criadoEm`)
SELECT CONCAT('presente-fotos-', `id`), `id`, 'FOTOS', 7, 'BOAS_VINDAS', UTC_TIMESTAMP(3) FROM `usuarios`
WHERE `perfil` = 'ANUNCIANTE' AND `ativo` = 1 AND `emailConfirmadoEm` IS NOT NULL AND `presenteEm` IS NULL
  AND LOWER(`email`) NOT REGEXP '(\.(test|example|invalid|localhost)|[@.]example\.(com|net|org))$';

UPDATE `usuarios` SET `bancoDiasSimples` = `bancoDiasSimples` + 7, `bancoDiasFotos` = `bancoDiasFotos` + 7, `presenteEm` = UTC_TIMESTAMP(3)
WHERE `perfil` = 'ANUNCIANTE' AND `ativo` = 1 AND `emailConfirmadoEm` IS NOT NULL AND `presenteEm` IS NULL
  AND LOWER(`email`) NOT REGEXP '(\.(test|example|invalid|localhost)|[@.]example\.(com|net|org))$';

-- RN-180: tabela proporcional. 10 e 20 dias saem da venda; 15 e 30 dias custam por dia o mesmo que 7 dias.
DELETE FROM `precos` WHERE `dias` IN (10, 20);
UPDATE `precos` SET `valor` = 2.14 WHERE `planoCodigo` = 'SIMPLES' AND `dias` = 15;
UPDATE `precos` SET `valor` = 4.29 WHERE `planoCodigo` = 'SIMPLES' AND `dias` = 30;
UPDATE `precos` SET `valor` = 21.43 WHERE `planoCodigo` = 'FOTOS' AND `dias` = 15;
UPDATE `precos` SET `valor` = 42.86 WHERE `planoCodigo` = 'FOTOS' AND `dias` = 30;
