-- Feature 014: o anunciante desativa e ativa o anúncio (RN-140 a RN-145).
-- Só acrescenta um valor ao enum; as linhas existentes não mudam.
ALTER TABLE `anuncios` MODIFY `situacao` ENUM('AGUARDANDO_PAGAMENTO', 'PUBLICADO', 'DESATIVADO', 'REMOVIDO') NOT NULL DEFAULT 'AGUARDANDO_PAGAMENTO';
