-- CreateTable
CREATE TABLE `usuarios` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(120) NOT NULL,
    `cpf` CHAR(11) NULL,
    `email` VARCHAR(160) NOT NULL,
    `celular` VARCHAR(11) NOT NULL DEFAULT '',
    `uf` CHAR(2) NOT NULL DEFAULT '',
    `cidadeCodigo` INTEGER NOT NULL DEFAULT 0,
    `senhaHash` VARCHAR(100) NOT NULL,
    `perfil` ENUM('ANUNCIANTE', 'ADMIN') NOT NULL DEFAULT 'ANUNCIANTE',
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `deveTrocarSenha` BOOLEAN NOT NULL DEFAULT false,
    `aceitouTermosEm` DATETIME(3) NULL,
    `ultimoAcesso` DATETIME(3) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    UNIQUE INDEX `usuarios_cpf_key`(`cpf`),
    UNIQUE INDEX `usuarios_email_key`(`email`),
    INDEX `usuarios_criadoEm_idx`(`criadoEm`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessoes` (
    `id` VARCHAR(191) NOT NULL,
    `usuarioId` VARCHAR(191) NOT NULL,
    `tokenHash` CHAR(64) NOT NULL,
    `expiraEm` DATETIME(3) NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `sessoes_tokenHash_key`(`tokenHash`),
    INDEX `sessoes_usuarioId_idx`(`usuarioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tentativas_login` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(160) NOT NULL,
    `ip` VARCHAR(64) NOT NULL,
    `sucesso` BOOLEAN NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `tentativas_login_ip_criadoEm_idx`(`ip`, `criadoEm`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categorias` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(60) NOT NULL,
    `slug` VARCHAR(70) NOT NULL,
    `ordem` INTEGER NOT NULL DEFAULT 0,
    `ativa` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `categorias_slug_key`(`slug`),
    INDEX `categorias_ordem_idx`(`ordem`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `anuncios` (
    `id` VARCHAR(191) NOT NULL,
    `codigo` CHAR(6) NOT NULL,
    `usuarioId` VARCHAR(191) NOT NULL,
    `categoriaId` VARCHAR(191) NOT NULL,
    `uf` CHAR(2) NOT NULL,
    `cidadeCodigo` INTEGER NOT NULL,
    `titulo` VARCHAR(40) NOT NULL,
    `texto` VARCHAR(400) NOT NULL,
    `preco` DECIMAL(12, 2) NULL,
    `moldura` ENUM('NENHUMA', 'SIMPLES', 'DUPLA', 'TRACEJADA') NOT NULL DEFAULT 'SIMPLES',
    `estiloTitulo` ENUM('NEGRITO', 'TARJA', 'SUBLINHADO') NOT NULL DEFAULT 'NEGRITO',
    `alinhamento` ENUM('ESQUERDA', 'CENTRO') NOT NULL DEFAULT 'ESQUERDA',
    `estrelas` BOOLEAN NOT NULL DEFAULT false,
    `situacao` ENUM('AGUARDANDO_PAGAMENTO', 'PUBLICADO', 'REMOVIDO') NOT NULL DEFAULT 'AGUARDANDO_PAGAMENTO',
    `publicadoEm` DATETIME(3) NULL,
    `expiraEm` DATETIME(3) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    UNIQUE INDEX `anuncios_codigo_key`(`codigo`),
    INDEX `anuncios_cidadeCodigo_categoriaId_situacao_expiraEm_idx`(`cidadeCodigo`, `categoriaId`, `situacao`, `expiraEm`),
    INDEX `anuncios_usuarioId_idx`(`usuarioId`),
    INDEX `anuncios_categoriaId_idx`(`categoriaId`),
    INDEX `anuncios_uf_cidadeCodigo_idx`(`uf`, `cidadeCodigo`),
    INDEX `anuncios_criadoEm_idx`(`criadoEm`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fotos_anuncio` (
    `id` VARCHAR(191) NOT NULL,
    `anuncioId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `publicId` VARCHAR(255) NOT NULL,
    `ordem` INTEGER NOT NULL DEFAULT 0,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `fotos_anuncio_anuncioId_ordem_idx`(`anuncioId`, `ordem`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mensagens` (
    `id` VARCHAR(191) NOT NULL,
    `anuncioId` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(80) NOT NULL,
    `contato` VARCHAR(120) NOT NULL,
    `texto` TEXT NOT NULL,
    `lida` BOOLEAN NOT NULL DEFAULT false,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `mensagens_anuncioId_criadoEm_idx`(`anuncioId`, `criadoEm`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pagamentos` (
    `id` VARCHAR(191) NOT NULL,
    `codigo` CHAR(10) NOT NULL,
    `anuncioId` VARCHAR(191) NOT NULL,
    `usuarioId` VARCHAR(191) NOT NULL,
    `valor` DECIMAL(10, 2) NOT NULL,
    `dias` INTEGER NOT NULL,
    `situacao` ENUM('PENDENTE', 'CONFIRMADO', 'CANCELADO') NOT NULL DEFAULT 'PENDENTE',
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `confirmadoEm` DATETIME(3) NULL,
    `confirmadoPorId` VARCHAR(191) NULL,

    UNIQUE INDEX `pagamentos_codigo_key`(`codigo`),
    INDEX `pagamentos_anuncioId_situacao_idx`(`anuncioId`, `situacao`),
    INDEX `pagamentos_usuarioId_situacao_idx`(`usuarioId`, `situacao`),
    INDEX `pagamentos_confirmadoPorId_idx`(`confirmadoPorId`),
    INDEX `pagamentos_situacao_criadoEm_idx`(`situacao`, `criadoEm`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `configuracoes` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'geral',
    `pixChave` VARCHAR(77) NOT NULL DEFAULT '',
    `pixNome` VARCHAR(25) NOT NULL DEFAULT '',
    `pixCidade` VARCHAR(15) NOT NULL DEFAULT '',
    `valorAnuncio` DECIMAL(10, 2) NOT NULL DEFAULT 1.00,
    `diasDePublicacao` INTEGER NOT NULL DEFAULT 7,
    `atualizadoEm` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

