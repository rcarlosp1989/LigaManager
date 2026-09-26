-- El grupo pasa a nivel de partido para que una misma jornada pueda mezclar partidos de varios grupos.
-- Es seguro sobre datos existentes: columna nullable y relleno desde la jornada.
-- Ejecutar ANTES de desplegar la nueva versión del backend.
ALTER TABLE partido
    ADD COLUMN id_grupo INT NULL,
    ADD INDEX idx_partido_grupo (id_grupo),
    ADD CONSTRAINT fk_partido_grupo FOREIGN KEY (id_grupo)
        REFERENCES grupo(id_grupo) ON DELETE SET NULL ON UPDATE CASCADE;

-- Los partidos de jornadas que ya tenían grupo heredan ese grupo.
UPDATE partido p
JOIN jornada j ON j.id_jornada = p.id_jornada
SET p.id_grupo = j.id_grupo
WHERE j.id_grupo IS NOT NULL AND p.id_grupo IS NULL;
