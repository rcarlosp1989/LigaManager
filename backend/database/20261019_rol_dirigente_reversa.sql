-- Reversa de 20261019_rol_dirigente.sql.
-- Publica primero el servidor anterior (revierte el PR) y después ejecuta este script.
--
-- El último paso falla a propósito si todavía hay usuarios con rol DIRIGENTE, para no perder datos.
-- Para revisarlo antes:   SELECT id_usuario, email FROM usuario WHERE rol = 'DIRIGENTE';
-- Si decides conservarlos desactivados (opcional):
--   UPDATE usuario SET rol = 'ORGANIZADOR', activo = 0 WHERE rol = 'DIRIGENTE';

DROP TABLE IF EXISTS invitacion_dirigente;
DROP TABLE IF EXISTS campeonato_dirigente;

ALTER TABLE usuario
    MODIFY COLUMN rol ENUM('ADMIN','ARBITRO','VEEDOR','DELEGADO','ORGANIZADOR','VOCAL') NOT NULL DEFAULT 'ADMIN';
