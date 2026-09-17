-- LigaManager: identificación y foto de jugadores.
-- Ejecutar una sola vez sobre una base existente.

ALTER TABLE persona
    ADD COLUMN cedula VARCHAR(20) NULL,
    ADD COLUMN foto_url VARCHAR(500) NULL;

UPDATE persona
SET cedula = CONCAT('LEGACY-', id_persona)
WHERE cedula IS NULL;

ALTER TABLE persona
    MODIFY COLUMN cedula VARCHAR(20) NOT NULL,
    ADD UNIQUE KEY uq_persona_cedula (cedula);