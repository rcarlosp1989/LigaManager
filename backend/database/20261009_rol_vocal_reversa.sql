-- Reversa de 20261009_rol_vocal.sql.
-- Publica primero el servidor anterior a la Fase 7 y después ejecuta este script.
--
-- El último paso falla a propósito si todavía hay usuarios con rol VOCAL, para no perder datos.
-- Para revisarlo antes:   SELECT id_usuario, email FROM usuario WHERE rol = 'VOCAL';
-- Si decides conservarlos desactivados como organizadores (opcional):
--   UPDATE usuario SET rol = 'ORGANIZADOR', activo = 0 WHERE rol = 'VOCAL';

DROP TABLE IF EXISTS invitacion_vocal;
DROP TABLE IF EXISTS campeonato_vocal;

ALTER TABLE usuario
    MODIFY COLUMN rol ENUM('ADMIN','ARBITRO','VEEDOR','DELEGADO','ORGANIZADOR') NOT NULL DEFAULT 'ADMIN';
