-- Feature 021: resposta do dono ao "Fechou negócio?" (RN-211).

-- AlterTable
ALTER TABLE `anuncios` ADD COLUMN `resultado` ENUM('PELO_CLASSIFICADOS', 'POR_OUTRO_LUGAR', 'AINDA_NAO') NULL,
    ADD COLUMN `resultadoEm` DATETIME(3) NULL;

