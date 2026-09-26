-- Rol Organizador para usuarios que se registran por su cuenta.
-- Solo se agrega el valor al ENUM; los roles y usuarios existentes no cambian.
ALTER TABLE usuario
    MODIFY COLUMN rol ENUM('ADMIN','ARBITRO','VEEDOR','DELEGADO','ORGANIZADOR') NOT NULL DEFAULT 'ADMIN';
