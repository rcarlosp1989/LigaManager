-- LigaManager: logos de equipos y fotos de jugadores guardados en la base de datos.
--
-- Antes las fotos se guardaban en una carpeta del servidor de Railway, que se borra en cada
-- publicación. Ahora se guardan en la tabla «imagen» (achicadas por la app: ~20-40 KB cada una).
-- La dirección pública es /api/imagenes/{id_imagen}; el código es aleatorio.
-- Compatible con el servidor anterior (tabla y columna nuevas, opcionales).
-- Ejecutar una sola vez, en Railway, ANTES de fusionar el PR.

CREATE TABLE imagen (
    id_imagen          VARCHAR(32)  NOT NULL,
    contenido          MEDIUMBLOB   NOT NULL,
    tipo_mime          VARCHAR(20)  NOT NULL,
    bytes              INT          NOT NULL,
    id_usuario_creador INT          NULL,
    creado_en          DATETIME     NOT NULL,
    PRIMARY KEY (id_imagen),
    KEY idx_imagen_usuario (id_usuario_creador),
    CONSTRAINT fk_imagen_usuario FOREIGN KEY (id_usuario_creador) REFERENCES usuario (id_usuario)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE equipo
    ADD COLUMN logo_url VARCHAR(200) NULL;

-- Comprobación: debe mostrar la columna nueva y la tabla vacía.
SHOW COLUMNS FROM equipo LIKE 'logo_url';
SELECT COUNT(*) AS imagenes FROM imagen;

-- Para saber cuánto ocupan las imágenes más adelante (si pasa de ~1 GB, conviene Cloudflare R2):
--   SELECT COUNT(*) AS imagenes, ROUND(SUM(bytes) / 1024 / 1024, 1) AS megabytes FROM imagen;
