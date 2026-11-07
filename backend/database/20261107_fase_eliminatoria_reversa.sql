-- Reversa de 20261107_fase_eliminatoria.sql.
-- Publique primero el servidor anterior (revierta el PR) y después ejecute este script.
-- ATENCIÓN: borra la configuración de la fase eliminatoria y sus llaves. Los partidos de la fase
-- quedan como partidos comunes en sus jornadas (sin llave ni penales). Las instancias agregadas
-- al catálogo se dejan (pueden estar en uso por jornadas).

ALTER TABLE partido
    DROP FOREIGN KEY fk_partido_llave,
    DROP INDEX idx_partido_llave,
    DROP COLUMN id_llave,
    DROP COLUMN penales_local,
    DROP COLUMN penales_visitante;

DROP TABLE IF EXISTS llave;
DROP TABLE IF EXISTS ronda_eliminatoria;
DROP TABLE IF EXISTS fase_eliminatoria;
