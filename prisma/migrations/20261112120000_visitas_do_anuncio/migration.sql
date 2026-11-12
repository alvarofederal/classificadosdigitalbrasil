-- Feature 013 (ADR-18): visitas do anúncio por dia, pessoa e cidade.
-- Tabela nova: nada muda nas existentes. O total continua em `anuncios.visualizacoes` (RN-136).
-- Sem IP: `chave` é um HMAC-SHA-256 do anúncio, do IP e do navegador (RN-131).

-- CreateTable
CREATE TABLE `visitas_anuncio` (
    `anuncioId` VARCHAR(191) NOT NULL,
    `dia` DATE NOT NULL,
    `chave` CHAR(64) NOT NULL,
    `vezes` INTEGER NOT NULL DEFAULT 1,
    `cidade` VARCHAR(80) NULL,
    `uf` CHAR(2) NULL,
    `pais` CHAR(2) NULL,

    PRIMARY KEY (`anuncioId`, `dia`, `chave`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
