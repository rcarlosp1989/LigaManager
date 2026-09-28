-- Geografia jerarquica: pais -> provincia -> canton.
-- Es la fase "expandir": NO se elimina ni modifica la tabla ciudad ni persona.id_ciudad / estadio.id_ciudad,
-- de modo que el backend actual sigue funcionando sin cambios. Se agrega persona.id_canton y estadio.id_canton
-- (nullable) para que el codigo pueda migrar a canton y luego retirar ciudad.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS provincia (
    id_provincia INT NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    id_pais INT NOT NULL,
    PRIMARY KEY (id_provincia),
    UNIQUE KEY uq_provincia_pais_nombre (id_pais, nombre),
    CONSTRAINT fk_provincia_pais FOREIGN KEY (id_pais) REFERENCES pais(id_pais)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS canton (
    id_canton INT NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    id_provincia INT NOT NULL,
    PRIMARY KEY (id_canton),
    UNIQUE KEY uq_canton_provincia_nombre (id_provincia, nombre),
    CONSTRAINT fk_canton_provincia FOREIGN KEY (id_provincia) REFERENCES provincia(id_provincia)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Provincias de Ecuador ────────────────────────────────────────────────────
INSERT IGNORE INTO pais (nombre) VALUES ('Ecuador');
SET @ec := (SELECT id_pais FROM pais WHERE nombre = 'Ecuador');

INSERT IGNORE INTO provincia (nombre, id_pais) VALUES
 ('Azuay', @ec), ('Bolívar', @ec), ('Cañar', @ec), ('Carchi', @ec), ('Chimborazo', @ec),
 ('Cotopaxi', @ec), ('El Oro', @ec), ('Esmeraldas', @ec), ('Galápagos', @ec), ('Guayas', @ec),
 ('Imbabura', @ec), ('Loja', @ec), ('Los Ríos', @ec), ('Manabí', @ec), ('Morona Santiago', @ec),
 ('Napo', @ec), ('Orellana', @ec), ('Pastaza', @ec), ('Pichincha', @ec), ('Santa Elena', @ec),
 ('Santo Domingo de los Tsáchilas', @ec), ('Sucumbíos', @ec), ('Tungurahua', @ec), ('Zamora Chinchipe', @ec);

-- ── Cantones: los 25 de Guayas + los de las ciudades que ya existian en el catalogo ──
INSERT IGNORE INTO canton (nombre, id_provincia)
SELECT c.nombre, p.id_provincia
FROM (
    SELECT 'Guayaquil' AS nombre, 'Guayas' AS prov
    UNION ALL SELECT 'Alfredo Baquerizo Moreno', 'Guayas'
    UNION ALL SELECT 'Balao', 'Guayas'
    UNION ALL SELECT 'Balzar', 'Guayas'
    UNION ALL SELECT 'Colimes', 'Guayas'
    UNION ALL SELECT 'Coronel Marcelino Maridueña', 'Guayas'
    UNION ALL SELECT 'Daule', 'Guayas'
    UNION ALL SELECT 'Durán', 'Guayas'
    UNION ALL SELECT 'El Empalme', 'Guayas'
    UNION ALL SELECT 'El Triunfo', 'Guayas'
    UNION ALL SELECT 'General Antonio Elizalde', 'Guayas'
    UNION ALL SELECT 'Isidro Ayora', 'Guayas'
    UNION ALL SELECT 'Lomas de Sargentillo', 'Guayas'
    UNION ALL SELECT 'Milagro', 'Guayas'
    UNION ALL SELECT 'Naranjal', 'Guayas'
    UNION ALL SELECT 'Naranjito', 'Guayas'
    UNION ALL SELECT 'Nobol', 'Guayas'
    UNION ALL SELECT 'Palestina', 'Guayas'
    UNION ALL SELECT 'Pedro Carbo', 'Guayas'
    UNION ALL SELECT 'Playas', 'Guayas'
    UNION ALL SELECT 'Salitre', 'Guayas'
    UNION ALL SELECT 'Samborondón', 'Guayas'
    UNION ALL SELECT 'San Jacinto de Yaguachi', 'Guayas'
    UNION ALL SELECT 'Santa Lucía', 'Guayas'
    UNION ALL SELECT 'Simón Bolívar', 'Guayas'
    UNION ALL SELECT 'Machala', 'El Oro'
    UNION ALL SELECT 'Quito', 'Pichincha'
    UNION ALL SELECT 'Cuenca', 'Azuay'
    UNION ALL SELECT 'Ambato', 'Tungurahua'
    UNION ALL SELECT 'Loja', 'Loja'
    UNION ALL SELECT 'Ibarra', 'Imbabura'
) c
JOIN provincia p ON p.nombre = c.prov AND p.id_pais = @ec;

-- ── Enlace desde persona y estadio (nullable: el codigo actual sigue usando id_ciudad) ──
ALTER TABLE persona
    ADD COLUMN id_canton INT NULL,
    ADD INDEX idx_persona_canton (id_canton),
    ADD CONSTRAINT fk_persona_canton FOREIGN KEY (id_canton) REFERENCES canton(id_canton)
        ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE estadio
    ADD COLUMN id_canton INT NULL,
    ADD INDEX idx_estadio_canton (id_canton),
    ADD CONSTRAINT fk_estadio_canton FOREIGN KEY (id_canton) REFERENCES canton(id_canton)
        ON DELETE SET NULL ON UPDATE CASCADE;

-- Relleno de datos existentes: la ciudad se corresponde con el canton del mismo nombre y pais.
UPDATE persona p
JOIN ciudad ci   ON ci.id_ciudad = p.id_ciudad
JOIN provincia pr ON pr.id_pais = ci.id_pais
JOIN canton k    ON k.id_provincia = pr.id_provincia AND k.nombre = ci.nombre
SET p.id_canton = k.id_canton
WHERE p.id_canton IS NULL;

UPDATE estadio e
JOIN ciudad ci   ON ci.id_ciudad = e.id_ciudad
JOIN provincia pr ON pr.id_pais = ci.id_pais
JOIN canton k    ON k.id_provincia = pr.id_provincia AND k.nombre = ci.nombre
SET e.id_canton = k.id_canton
WHERE e.id_canton IS NULL;
