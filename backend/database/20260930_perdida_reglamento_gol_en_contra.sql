-- Planilla de juego:
--  1) Partido perdido por reglamento (3-0 administrativo). El equipo sancionado pierde 0-3; los 3 goles no se
--     atribuyen a ningun jugador (no hay eventos) y el marcador queda guardado en goles_local / goles_visitante,
--     por lo que las tablas de posiciones lo cuentan como cualquier otro resultado (3 pts, GF 3 / GC 0 para el
--     beneficiado; GF 0 / GC 3 para el sancionado).
--  2) Gol en contra: nuevo valor 'GOL_EN_CONTRA' en eventopartido.tipo_evento. Suma al equipo contrario del jugador
--     y, al ser un tipo distinto de 'GOL', no cuenta como gol del jugador (goleadores).
-- Todo es compatible con datos existentes: columnas con valor por defecto / nulas y un valor mas en el ENUM.
ALTER TABLE partido
    ADD COLUMN perdida_reglamento TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN id_equipo_sancionado INT NULL,
    ADD CONSTRAINT fk_partido_equipo_sancionado FOREIGN KEY (id_equipo_sancionado)
        REFERENCES equipo (id_equipo) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE eventopartido
    MODIFY COLUMN tipo_evento ENUM('GOL','TARJETA_AMARILLA','TARJETA_ROJA','GOL_EN_CONTRA') NOT NULL;
