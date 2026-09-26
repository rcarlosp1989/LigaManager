-- Alineaciones (titulares/suplentes convocados) y cambios (sustituciones) por partido.

CREATE TABLE IF NOT EXISTS alineacion_jugador (
    id_alineacion INT NOT NULL AUTO_INCREMENT,
    id_partido INT NOT NULL,
    id_equipo INT NOT NULL,
    id_jugador INT NOT NULL,
    titular TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_alineacion),
    UNIQUE KEY uq_alineacion_partido_jugador (id_partido, id_jugador),
    CONSTRAINT fk_al_partido FOREIGN KEY (id_partido) REFERENCES partido(id_partido) ON DELETE CASCADE,
    CONSTRAINT fk_al_equipo FOREIGN KEY (id_equipo) REFERENCES equipo(id_equipo),
    CONSTRAINT fk_al_jugador FOREIGN KEY (id_jugador) REFERENCES jugador(id_jugador)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cambio_partido (
    id_cambio INT NOT NULL AUTO_INCREMENT,
    id_partido INT NOT NULL,
    id_equipo INT NOT NULL,
    id_jugador_sale INT NOT NULL,
    id_jugador_entra INT NOT NULL,
    minuto INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_cambio),
    CONSTRAINT fk_cp_partido FOREIGN KEY (id_partido) REFERENCES partido(id_partido) ON DELETE CASCADE,
    CONSTRAINT fk_cp_equipo FOREIGN KEY (id_equipo) REFERENCES equipo(id_equipo),
    CONSTRAINT fk_cp_jugador_sale FOREIGN KEY (id_jugador_sale) REFERENCES jugador(id_jugador),
    CONSTRAINT fk_cp_jugador_entra FOREIGN KEY (id_jugador_entra) REFERENCES jugador(id_jugador)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
