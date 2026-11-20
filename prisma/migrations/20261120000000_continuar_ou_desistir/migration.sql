-- Feature 024 (ADR-25): e-mail de continuar ou desistir do cadastro sem confirmação.
-- Só acrescenta duas colunas vazias e dois índices em `usuarios`; nenhuma conta muda.

-- AlterTable
ALTER TABLE `usuarios` ADD COLUMN `contatoEnviadoEm` DATETIME(3) NULL,
    ADD COLUMN `contatoHash` CHAR(64) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `usuarios_contatoHash_key` ON `usuarios`(`contatoHash`);

-- CreateIndex
CREATE INDEX `usuarios_emailConfirmadoEm_contatoEnviadoEm_idx` ON `usuarios`(`emailConfirmadoEm`, `contatoEnviadoEm`);

