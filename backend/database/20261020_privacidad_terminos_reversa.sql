-- Reversa de 20261020_privacidad_terminos.sql.
-- Publica primero el servidor anterior (revierte el PR) y después ejecuta este script.
-- Se pierde el registro de quién y cuándo dio la autorización y aceptó los términos.

ALTER TABLE persona
    DROP FOREIGN KEY fk_persona_autorizacion_por,
    DROP COLUMN autorizacion_datos_por,
    DROP COLUMN autorizacion_datos_en;

ALTER TABLE usuario
    DROP COLUMN terminos_version,
    DROP COLUMN terminos_aceptados_en;
