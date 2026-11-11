-- Reversa de 20261110_pagos.sql.
-- Publique primero el servidor anterior (revierta el PR) y después ejecute este script.
-- ATENCIÓN: borra los valores de los campeonatos y el detalle, método y referencia de cobros y
-- abonos. Los cobros y abonos quedan (con monto y fecha). Los conceptos del catálogo se dejan.

ALTER TABLE abono
    DROP INDEX idx_abono_lote,
    DROP COLUMN metodo,
    DROP COLUMN referencia,
    DROP COLUMN lote;

ALTER TABLE pago
    DROP INDEX uq_pago_clave_auto,
    DROP COLUMN descripcion,
    DROP COLUMN id_partido,
    DROP COLUMN clave_auto;

ALTER TABLE conceptopago
    DROP INDEX uq_conceptopago_codigo,
    DROP COLUMN codigo;

DROP TABLE IF EXISTS campeonato_tarifa;
