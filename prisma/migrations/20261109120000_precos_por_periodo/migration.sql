-- Feature 009: um preço por plano e período (7, 10, 15, 20, 30 dias).
-- Ordem: cria a tabela, copia os preços de 7 e 30 dias que já existiam, grava a tabela decidida pelo Álvaro
-- em 2026-11-09 para Simples e Com foto, ajusta os planos e só então remove as colunas antigas.

-- CreateTable
CREATE TABLE `precos` (
    `planoCodigo` VARCHAR(20) NOT NULL,
    `dias` INTEGER NOT NULL,
    `valor` DECIMAL(10, 2) NOT NULL,

    PRIMARY KEY (`planoCodigo`, `dias`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Preços que já existiam (Destaque e Vitrine continuam com 7 e 30 dias).
INSERT INTO `precos` (`planoCodigo`, `dias`, `valor`) SELECT `codigo`, 7, `valor7Dias` FROM `planos`;
INSERT INTO `precos` (`planoCodigo`, `dias`, `valor`) SELECT `codigo`, 30, `valor30Dias` FROM `planos`;

-- Tabela decidida (spec 009): Simples 1 / 4 / 9,50 / 14,50 / 25; Com foto 10 / 40 / 95 / 145 / 250.
INSERT INTO `precos` (`planoCodigo`, `dias`, `valor`) VALUES
    ('SIMPLES', 7, 1.00), ('SIMPLES', 10, 4.00), ('SIMPLES', 15, 9.50), ('SIMPLES', 20, 14.50), ('SIMPLES', 30, 25.00),
    ('FOTOS', 7, 10.00), ('FOTOS', 10, 40.00), ('FOTOS', 15, 95.00), ('FOTOS', 20, 145.00), ('FOTOS', 30, 250.00)
ON DUPLICATE KEY UPDATE `valor` = VALUES(`valor`);

-- Simples sem foto (RN-57); Com foto com o nome da decisão; Destaque e Vitrine fora de venda.
UPDATE `planos` SET `maxFotos` = 0, `descricao` = 'Texto com formatação, página própria e chat com os interessados.' WHERE `codigo` = 'SIMPLES';
UPDATE `planos` SET `nome` = 'Com foto', `maxFotos` = 6, `descricao` = 'Tudo do Simples, com álbum de até 6 fotos.' WHERE `codigo` = 'FOTOS';
UPDATE `planos` SET `ativo` = false WHERE `codigo` IN ('DESTAQUE', 'VITRINE');

-- AlterTable
ALTER TABLE `planos` DROP COLUMN `valor30Dias`,
    DROP COLUMN `valor7Dias`;
