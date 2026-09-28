-- Planilla de juego: observaciones opcionales del partido y marca de "partido desierto".
-- Un partido desierto no suma puntos a ningun equipo; en la tabla de posiciones cada equipo suma 1 partido
-- jugado, sin goles a favor ni en contra. Columnas con valor por defecto: es seguro con datos existentes.
ALTER TABLE partido
    ADD COLUMN observaciones TEXT NULL,
    ADD COLUMN desierto TINYINT(1) NOT NULL DEFAULT 0;
