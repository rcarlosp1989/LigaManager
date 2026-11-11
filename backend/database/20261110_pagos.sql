-- LigaManager: gestión de pagos de los campeonatos.
--  - campeonato_tarifa: valores de cada campeonato (inscripción del equipo, refuerzo, apelación,
--    arbitraje por equipo y partido, tarjeta amarilla y roja) y la fecha de inicio de la segunda
--    etapa: los jugadores inscritos desde esa fecha se cobran como refuerzo.
--  - conceptopago.codigo y los conceptos que usa el sistema.
--  - pago: descripción (detalle), id_partido y clave_auto (identifica los cobros que genera el
--    sistema para no repetirlos). Todos los cobros van a nombre del equipo (id_equipo); el trigger
--    trg_pago_destino_* no se toca.
--  - abono: método, referencia y lote (los abonos que se registraron juntos, para el recibo).
-- Solo agrega tablas, columnas y filas de catálogo: el servidor actual sigue funcionando.
-- Ejecutar una sola vez, en Railway (y en la base local), ANTES de fusionar el PR.

CREATE TABLE IF NOT EXISTS campeonato_tarifa (
    id_campeonato        INT NOT NULL,
    inscripcion          DECIMAL(10,2) NOT NULL DEFAULT 0,
    refuerzo             DECIMAL(10,2) NOT NULL DEFAULT 0,
    apelacion            DECIMAL(10,2) NOT NULL DEFAULT 0,
    arbitraje            DECIMAL(10,2) NOT NULL DEFAULT 0,
    amarilla             DECIMAL(10,2) NOT NULL DEFAULT 0,
    roja                 DECIMAL(10,2) NOT NULL DEFAULT 0,
    inicio_segunda_etapa DATE NULL,
    updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id_campeonato),
    CONSTRAINT fk_tarifa_campeonato FOREIGN KEY (id_campeonato) REFERENCES campeonato (id_campeonato)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_tarifa_valores CHECK (inscripcion >= 0 AND refuerzo >= 0 AND apelacion >= 0
        AND arbitraje >= 0 AND amarilla >= 0 AND roja >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE conceptopago
    ADD COLUMN codigo VARCHAR(20) NULL,
    ADD UNIQUE KEY uq_conceptopago_codigo (codigo);

-- Si ya existe un concepto con la misma descripción, se le asigna el código; si no, se crea.
UPDATE conceptopago c
JOIN (
    SELECT 'INSCRIPCION' AS codigo, 'Inscripción del equipo' AS descripcion UNION ALL
    SELECT 'REFUERZO', 'Refuerzo' UNION ALL SELECT 'ARBITRAJE', 'Arbitraje' UNION ALL
    SELECT 'AMARILLA', 'Tarjeta amarilla' UNION ALL SELECT 'ROJA', 'Tarjeta roja' UNION ALL
    SELECT 'MULTA', 'Multa' UNION ALL SELECT 'APELACION', 'Apelación' UNION ALL SELECT 'OTRO', 'Otro'
) t ON t.descripcion = c.descripcion
SET c.codigo = t.codigo
WHERE c.codigo IS NULL;

INSERT INTO conceptopago (codigo, descripcion)
SELECT t.codigo, t.descripcion
FROM (
    SELECT 'INSCRIPCION' AS codigo, 'Inscripción del equipo' AS descripcion UNION ALL
    SELECT 'REFUERZO', 'Refuerzo' UNION ALL SELECT 'ARBITRAJE', 'Arbitraje' UNION ALL
    SELECT 'AMARILLA', 'Tarjeta amarilla' UNION ALL SELECT 'ROJA', 'Tarjeta roja' UNION ALL
    SELECT 'MULTA', 'Multa' UNION ALL SELECT 'APELACION', 'Apelación' UNION ALL SELECT 'OTRO', 'Otro'
) t
WHERE NOT EXISTS (SELECT 1 FROM conceptopago c WHERE c.codigo = t.codigo);

ALTER TABLE pago
    ADD COLUMN descripcion VARCHAR(200) NULL,
    ADD COLUMN id_partido  INT NULL,
    ADD COLUMN clave_auto  VARCHAR(60) NULL,
    ADD UNIQUE KEY uq_pago_clave_auto (clave_auto);

ALTER TABLE abono
    ADD COLUMN metodo     ENUM('EFECTIVO','TRANSFERENCIA','DEPOSITO','OTRO') NOT NULL DEFAULT 'EFECTIVO',
    ADD COLUMN referencia VARCHAR(100) NULL,
    ADD COLUMN lote       CHAR(32) NULL,
    ADD KEY idx_abono_lote (lote);

-- Comprobación: 1 tabla nueva, 8 conceptos con código, 3 columnas en pago y 3 en abono.
SELECT COUNT(*) AS tabla_tarifa FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'campeonato_tarifa';
SELECT COUNT(*) AS conceptos FROM conceptopago WHERE codigo IS NOT NULL;
SELECT COUNT(*) AS columnas_pago FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pago' AND COLUMN_NAME IN ('descripcion', 'id_partido', 'clave_auto');
SELECT COUNT(*) AS columnas_abono FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'abono' AND COLUMN_NAME IN ('metodo', 'referencia', 'lote');
