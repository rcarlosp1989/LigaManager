-- LigaManager: deshace 20261026_reloj_en_vivo.sql (quita el reloj del partido).
-- Antes de ejecutarla, volver a la versión anterior del backend.

ALTER TABLE partido
    DROP COLUMN reloj_fase,
    DROP COLUMN reloj_segundos,
    DROP COLUMN reloj_desde,
    DROP COLUMN reloj_duracion_min,
    DROP COLUMN reloj_actualizado_en;
