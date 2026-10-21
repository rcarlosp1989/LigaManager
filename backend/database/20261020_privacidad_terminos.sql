-- LigaManager: autorización de tratamiento de datos de los jugadores y aceptación de los
-- términos de uso por parte de los organizadores.
--
-- 1) persona.autorizacion_datos_en / autorizacion_datos_por: cuándo y quién registró que la
--    organización cuenta con la autorización del jugador. Para los jugadores que ya existen
--    se da por otorgada (decisión de Roberto, 20 oct 2026): queda con la fecha de este script.
-- 2) usuario.terminos_aceptados_en / terminos_version: cuándo y qué versión de los términos
--    aceptó el organizador. Los que ya existen quedan sin aceptar: la app se los pide al entrar.
--
-- Solo agrega columnas: el servidor actual sigue funcionando con el script aplicado.
-- Ejecutar una sola vez, en Railway, ANTES de fusionar el PR.

ALTER TABLE persona
    ADD COLUMN autorizacion_datos_en  DATETIME NULL,
    ADD COLUMN autorizacion_datos_por INT NULL,
    ADD CONSTRAINT fk_persona_autorizacion_por FOREIGN KEY (autorizacion_datos_por) REFERENCES usuario (id_usuario) ON DELETE SET NULL;

UPDATE persona p
JOIN jugador j ON j.id_persona = p.id_persona
SET p.autorizacion_datos_en = UTC_TIMESTAMP()
WHERE p.autorizacion_datos_en IS NULL;

ALTER TABLE usuario
    ADD COLUMN terminos_aceptados_en DATETIME NULL,
    ADD COLUMN terminos_version      VARCHAR(20) NULL;

-- Comprobación: jugadores con autorización y organizadores que todavía deben aceptar.
SELECT
    (SELECT COUNT(*) FROM persona p JOIN jugador j ON j.id_persona = p.id_persona WHERE p.autorizacion_datos_en IS NOT NULL) AS jugadores_con_autorizacion,
    (SELECT COUNT(*) FROM usuario WHERE terminos_version IS NULL AND rol IN ('ADMIN','ORGANIZADOR')) AS organizadores_por_aceptar;
