-- Ubicacion de personas y estadios: pais + (provincia/canton solo si el pais los tiene).
-- Los extranjeros no tienen canton, asi que el pais se guarda en persona/estadio y ya no se deduce de ciudad.
-- id_ciudad pasa a ser opcional (el backend nuevo ya no la usa; ciudad se retirara mas adelante).
-- Requiere 20260927_pais_provincia_canton.sql y 20260927_cantones_ecuador.sql.

ALTER TABLE persona
    ADD COLUMN id_pais INT NULL,
    ADD INDEX idx_persona_pais (id_pais),
    ADD CONSTRAINT fk_persona_pais FOREIGN KEY (id_pais) REFERENCES pais(id_pais)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    MODIFY COLUMN id_ciudad INT NULL;

ALTER TABLE estadio
    ADD COLUMN id_pais INT NULL,
    ADD INDEX idx_estadio_pais (id_pais),
    ADD CONSTRAINT fk_estadio_pais FOREIGN KEY (id_pais) REFERENCES pais(id_pais)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    MODIFY COLUMN id_ciudad INT NULL;

-- Datos existentes: el pais es el de su ciudad.
UPDATE persona p JOIN ciudad c ON c.id_ciudad = p.id_ciudad
SET p.id_pais = c.id_pais WHERE p.id_pais IS NULL;

UPDATE estadio e JOIN ciudad c ON c.id_ciudad = e.id_ciudad
SET e.id_pais = c.id_pais WHERE e.id_pais IS NULL;

-- Completa el canton de filas existentes que aun no lo tengan (mismo criterio que 20260927).
UPDATE persona p
JOIN ciudad ci    ON ci.id_ciudad = p.id_ciudad
JOIN provincia pr ON pr.id_pais = ci.id_pais
JOIN canton k     ON k.id_provincia = pr.id_provincia AND k.nombre = ci.nombre
SET p.id_canton = k.id_canton
WHERE p.id_canton IS NULL;

UPDATE estadio e
JOIN ciudad ci    ON ci.id_ciudad = e.id_ciudad
JOIN provincia pr ON pr.id_pais = ci.id_pais
JOIN canton k     ON k.id_provincia = pr.id_provincia AND k.nombre = ci.nombre
SET e.id_canton = k.id_canton
WHERE e.id_canton IS NULL;
