-- Reversa de 20261009_registro_en_vivo.sql.
-- Publica primero el servidor anterior a la Fase 8 y después ejecuta este script.
-- Se pierden el estado de registro de los partidos, quién registró cada cosa y los id_cliente.
-- Los goles, tarjetas, cambios y convocatorias se conservan.

ALTER TABLE alineacion_jugador
    DROP FOREIGN KEY fk_alineacion_usuario_registro,
    DROP COLUMN id_usuario_registro;

ALTER TABLE cambio_partido
    DROP FOREIGN KEY fk_cambio_usuario_registro,
    DROP INDEX uq_cambio_cliente,
    DROP COLUMN id_cliente,
    DROP COLUMN id_usuario_registro;

ALTER TABLE eventopartido
    DROP FOREIGN KEY fk_evento_usuario_registro,
    DROP INDEX uq_evento_cliente,
    DROP COLUMN id_cliente,
    DROP COLUMN id_usuario_registro;

ALTER TABLE partido
    DROP FOREIGN KEY fk_partido_usuario_cierre,
    DROP COLUMN id_usuario_cierre,
    DROP COLUMN cerrado_en,
    DROP COLUMN iniciado_en,
    DROP COLUMN estado_registro;
