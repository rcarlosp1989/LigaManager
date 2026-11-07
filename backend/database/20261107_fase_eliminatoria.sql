-- LigaManager: fase eliminatoria (llaves) configurable por campeonato.
-- Un solo script para las dos entregas (llaves manuales y desempate al cerrar).
--  - fase_eliminatoria: una por campeonato. Modo (por ahora MANUAL), equipos que clasifican,
--    partido por el tercer puesto y qué pasa con tarjetas y suspensiones al empezar la fase.
--  - ronda_eliminatoria: reglas de cada ronda (octavos, cuartos, semifinal, tercer puesto,
--    final): partido único o ida y vuelta, criterio si la llave empata y gol de visitante.
--  - llave: los dos equipos de cada cruce (A es local en la ida) y, si el organizador lo define
--    a mano, el ganador.
--  - partido.id_llave (a qué llave pertenece) y partido.penales_local / penales_visitante.
--  - catalogoinstancia: agrega Octavos de final, Cuartos de final, Semifinal, Tercer puesto y
--    Final si faltan (nombres de las jornadas de la fase).
-- Solo agrega tablas y columnas: el servidor actual sigue funcionando con el script aplicado.
-- Ejecutar una sola vez, en Railway (y en la base local), ANTES de fusionar el PR.

CREATE TABLE IF NOT EXISTS fase_eliminatoria (
    id_fase_eliminatoria INT NOT NULL AUTO_INCREMENT,
    id_campeonato        INT NOT NULL,
    modo                 ENUM('MANUAL','AUTOMATICO') NOT NULL DEFAULT 'MANUAL',
    equipos_clasifican   INT NOT NULL,
    tercer_puesto        TINYINT(1) NOT NULL DEFAULT 0,
    regla_tarjetas       ENUM('BORRAR_SALVO_EXPULSION_FINAL','MANTENER','BORRAR_TODO') NOT NULL DEFAULT 'BORRAR_SALVO_EXPULSION_FINAL',
    created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_fase_eliminatoria),
    UNIQUE KEY uq_fase_eliminatoria_campeonato (id_campeonato),
    CONSTRAINT fk_fase_eliminatoria_campeonato FOREIGN KEY (id_campeonato) REFERENCES campeonato (id_campeonato)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ronda_eliminatoria (
    id_ronda             INT NOT NULL AUTO_INCREMENT,
    id_fase_eliminatoria INT NOT NULL,
    tipo                 ENUM('OCTAVOS','CUARTOS','SEMIFINAL','TERCER_PUESTO','FINAL') NOT NULL,
    ida_y_vuelta         TINYINT(1) NOT NULL DEFAULT 0,
    desempate            ENUM('PENALES','PRORROGA_PENALES','MEJOR_UBICADO') NOT NULL DEFAULT 'PENALES',
    gol_visitante        TINYINT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (id_ronda),
    UNIQUE KEY uq_ronda_fase_tipo (id_fase_eliminatoria, tipo),
    CONSTRAINT fk_ronda_fase FOREIGN KEY (id_fase_eliminatoria) REFERENCES fase_eliminatoria (id_fase_eliminatoria)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS llave (
    id_llave    INT NOT NULL AUTO_INCREMENT,
    id_ronda    INT NOT NULL,
    orden       INT NOT NULL,
    id_equipo_a INT NOT NULL,
    id_equipo_b INT NOT NULL,
    id_ganador  INT NULL,
    PRIMARY KEY (id_llave),
    UNIQUE KEY uq_llave_ronda_orden (id_ronda, orden),
    KEY idx_llave_equipo_a (id_equipo_a),
    KEY idx_llave_equipo_b (id_equipo_b),
    KEY idx_llave_ganador (id_ganador),
    CONSTRAINT fk_llave_ronda FOREIGN KEY (id_ronda) REFERENCES ronda_eliminatoria (id_ronda)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_llave_equipo_a FOREIGN KEY (id_equipo_a) REFERENCES equipo (id_equipo),
    CONSTRAINT fk_llave_equipo_b FOREIGN KEY (id_equipo_b) REFERENCES equipo (id_equipo),
    CONSTRAINT fk_llave_ganador  FOREIGN KEY (id_ganador)  REFERENCES equipo (id_equipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE partido
    ADD COLUMN id_llave          INT NULL,
    ADD COLUMN penales_local     INT NULL,
    ADD COLUMN penales_visitante INT NULL,
    ADD KEY idx_partido_llave (id_llave),
    ADD CONSTRAINT fk_partido_llave FOREIGN KEY (id_llave) REFERENCES llave (id_llave);

-- catalogoinstancia.orden es obligatoria: las nuevas van después de las que ya existen.
INSERT INTO catalogoinstancia (nombre, orden)
SELECT t.nombre, (SELECT COALESCE(MAX(c2.orden), 0) FROM catalogoinstancia c2) + t.n
FROM (
    SELECT 'Octavos de final' AS nombre, 1 AS n UNION ALL SELECT 'Cuartos de final', 2 UNION ALL
    SELECT 'Semifinal', 3 UNION ALL SELECT 'Tercer puesto', 4 UNION ALL SELECT 'Final', 5
) t
WHERE NOT EXISTS (SELECT 1 FROM catalogoinstancia c WHERE c.nombre = t.nombre);

-- Comprobación: 3 tablas nuevas, 3 columnas en partido y las 5 instancias.
SELECT COUNT(*) AS tablas_nuevas FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('fase_eliminatoria', 'ronda_eliminatoria', 'llave');
SELECT COUNT(*) AS columnas_partido FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'partido' AND COLUMN_NAME IN ('id_llave', 'penales_local', 'penales_visitante');
SELECT nombre FROM catalogoinstancia WHERE nombre IN ('Octavos de final', 'Cuartos de final', 'Semifinal', 'Tercer puesto', 'Final');
