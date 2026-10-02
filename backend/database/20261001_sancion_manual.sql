-- Sanciones manuales: permite a la comisión disciplinaria agregar una suspensión a un jugador
-- en la sección de Estadísticas > Suspensiones, sin que provenga de una tarjeta registrada en
-- un partido. Es una tabla nueva, no toca nada existente.
CREATE TABLE IF NOT EXISTS sancion_manual (
    id_sancion       INT NOT NULL AUTO_INCREMENT,
    id_campeonato    INT NOT NULL,
    id_jugador       INT NOT NULL,
    motivo           VARCHAR(200) NOT NULL,
    partidos_sancion INT NOT NULL DEFAULT 1,
    fecha_decision   DATE NOT NULL,
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_sancion),
    KEY idx_sancion_campeonato (id_campeonato),
    KEY idx_sancion_jugador (id_jugador),
    CONSTRAINT fk_sancion_campeonato FOREIGN KEY (id_campeonato) REFERENCES campeonato (id_campeonato)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_sancion_jugador FOREIGN KEY (id_jugador) REFERENCES jugador (id_jugador)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
