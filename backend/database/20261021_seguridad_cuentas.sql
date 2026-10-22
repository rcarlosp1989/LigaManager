-- LigaManager: seguridad de cuentas (confirmar correo, restablecer contraseña, cerrar sesiones).
--
-- 1) usuario.email_verificado: las cuentas que ya existen quedan confirmadas (DEFAULT 1), así el
--    servidor actual sigue funcionando. El nuevo pone 0 al registrar un organizador, solo si hay
--    servicio de correo configurado.
-- 2) usuario.clave_cambiada_en: al restablecer la contraseña se cierran las sesiones anteriores.
-- 3) token_usuario: enlaces de un solo uso enviados por correo (se guarda solo el hash SHA-256).
--
-- Solo agrega columnas y una tabla: no cambia ni borra datos.
-- Ejecutar una sola vez, en Railway, ANTES de fusionar el PR.

ALTER TABLE usuario
    ADD COLUMN email_verificado  TINYINT(1) NOT NULL DEFAULT 1,
    ADD COLUMN clave_cambiada_en DATETIME NULL;

CREATE TABLE IF NOT EXISTS token_usuario (
    id_token   INT NOT NULL AUTO_INCREMENT,
    id_usuario INT NOT NULL,
    tipo       ENUM('VERIFICAR_CORREO','RESTABLECER_CLAVE') NOT NULL,
    token_hash CHAR(64) NOT NULL,
    vence_en   DATETIME NOT NULL,
    usado_en   DATETIME NULL,
    creado_en  DATETIME NOT NULL,
    PRIMARY KEY (id_token),
    UNIQUE KEY uq_token_usuario_hash (token_hash),
    KEY idx_token_usuario_usuario (id_usuario, tipo),
    CONSTRAINT fk_token_usuario_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Comprobación: todas las cuentas confirmadas y la tabla nueva.
SELECT COUNT(*) AS cuentas, SUM(email_verificado) AS confirmadas FROM usuario;
SHOW TABLES LIKE 'token_usuario';
