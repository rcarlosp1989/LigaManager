-- Reversa de 20261021_seguridad_cuentas.sql.
-- Publica primero el servidor anterior (revierte el PR) y después ejecuta este script.
-- Los organizadores que no confirmaron su correo podrán entrar igual con el servidor anterior.

DROP TABLE IF EXISTS token_usuario;

ALTER TABLE usuario
    DROP COLUMN clave_cambiada_en,
    DROP COLUMN email_verificado;
