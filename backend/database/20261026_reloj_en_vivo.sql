-- LigaManager: reloj del partido en el servidor (marcadores en vivo).
-- El celular del vocal envía el estado de su reloj; el enlace público y el dirigente lo
-- usan para mostrar el minuto y el «Medio tiempo».
--   reloj_fase:          ANTES | PRIMER_TIEMPO | DESCANSO | SEGUNDO_TIEMPO | FINAL
--   reloj_segundos:      segundos jugados del tiempo en curso hasta la última pausa
--   reloj_desde:         hora (UTC) en que se reanudó el reloj; NULL = en pausa
--   reloj_duracion_min:  minutos de cada tiempo que usa el vocal (NULL = la de la modalidad)
--   reloj_actualizado_en: última vez que llegó el reloj (UTC)
-- Solo agrega columnas con valor por defecto: el servidor actual sigue funcionando con el
-- script aplicado. Ejecutar una sola vez, en Railway, ANTES de fusionar el PR.

ALTER TABLE partido
    ADD COLUMN reloj_fase ENUM('ANTES','PRIMER_TIEMPO','DESCANSO','SEGUNDO_TIEMPO','FINAL') NOT NULL DEFAULT 'ANTES',
    ADD COLUMN reloj_segundos       INT      NOT NULL DEFAULT 0,
    ADD COLUMN reloj_desde          DATETIME NULL,
    ADD COLUMN reloj_duracion_min   INT      NULL,
    ADD COLUMN reloj_actualizado_en DATETIME NULL;

-- Comprobación: debe mostrar las cinco columnas nuevas.
SHOW COLUMNS FROM partido LIKE 'reloj_%';
