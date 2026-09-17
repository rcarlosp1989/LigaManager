-- Cargos oficiales por modalidad y designaciones por partido.

CREATE TABLE IF NOT EXISTS cargo_oficial (
    id_cargo INT NOT NULL AUTO_INCREMENT,
    codigo VARCHAR(50) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    PRIMARY KEY (id_cargo),
    UNIQUE KEY uq_cargo_codigo (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS modalidad_cargo (
    id_modalidad INT NOT NULL,
    id_cargo INT NOT NULL,
    obligatorio TINYINT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (id_modalidad, id_cargo),
    CONSTRAINT fk_mc_modalidad FOREIGN KEY (id_modalidad) REFERENCES modalidaddeportiva(id_modalidad),
    CONSTRAINT fk_mc_cargo FOREIGN KEY (id_cargo) REFERENCES cargo_oficial(id_cargo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS partido_oficial (
    id_partido INT NOT NULL,
    id_cargo INT NOT NULL,
    id_arbitro INT NOT NULL,
    PRIMARY KEY (id_partido, id_cargo),
    UNIQUE KEY uq_partido_oficial_persona (id_partido, id_arbitro),
    CONSTRAINT fk_po_partido FOREIGN KEY (id_partido) REFERENCES partido(id_partido) ON DELETE CASCADE,
    CONSTRAINT fk_po_cargo FOREIGN KEY (id_cargo) REFERENCES cargo_oficial(id_cargo),
    CONSTRAINT fk_po_arbitro FOREIGN KEY (id_arbitro) REFERENCES arbitro(id_arbitro)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO cargo_oficial (codigo, nombre) VALUES
('ARBITRO_PRINCIPAL', 'Arbitro principal'),
('JUEZ_CENTRAL', 'Juez central'),
('ASISTENTE_1', 'Linea 1'),
('ASISTENTE_2', 'Linea 2'),
('CUARTO_ARBITRO', 'Cuarto árbitro'),
('COMISARIO', 'Comisario'),
('MESA_CONTROL', 'Mesa de control')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

INSERT INTO modalidad_cargo (id_modalidad, id_cargo, obligatorio)
SELECT 1, id_cargo, CASE codigo WHEN 'JUEZ_CENTRAL' THEN 1 ELSE 0 END
FROM cargo_oficial WHERE codigo IN ('JUEZ_CENTRAL','ASISTENTE_1','ASISTENTE_2','CUARTO_ARBITRO','COMISARIO')
ON DUPLICATE KEY UPDATE obligatorio = VALUES(obligatorio);

INSERT INTO modalidad_cargo (id_modalidad, id_cargo, obligatorio)
SELECT 3, id_cargo, CASE codigo WHEN 'ARBITRO_PRINCIPAL' THEN 1 ELSE 0 END
FROM cargo_oficial WHERE codigo IN ('ARBITRO_PRINCIPAL','MESA_CONTROL')
ON DUPLICATE KEY UPDATE obligatorio = VALUES(obligatorio);

INSERT IGNORE INTO partido_oficial (id_partido, id_cargo, id_arbitro)
SELECT p.id_partido,
       c.id_cargo,
       p.id_arbitro
FROM partido p
JOIN jornada j ON j.id_jornada = p.id_jornada
JOIN campeonato ca ON ca.id_campeonato = j.id_campeonato
JOIN cargo_oficial c ON c.codigo = CASE
    WHEN ca.id_modalidad = 1 THEN 'JUEZ_CENTRAL'
    WHEN ca.id_modalidad = 3 THEN 'ARBITRO_PRINCIPAL'
    ELSE 'ARBITRO_PRINCIPAL'
END
WHERE p.id_arbitro IS NOT NULL;