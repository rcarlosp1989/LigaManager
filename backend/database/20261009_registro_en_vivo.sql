-- Fase 8: cierre y registro del modo en vivo.
-- Requiere la Fase 7 (20261009_rol_vocal.sql) aplicada.
--
-- partido.estado_registro: SIN_INICIAR / EN_VIVO / CERRADO, con hora de inicio, de cierre y quién cerró.
-- eventopartido, cambio_partido, alineacion_jugador: quién registró cada cosa.
-- eventopartido, cambio_partido: id_cliente, el identificador que manda el celular por cada registro.
--   Si el mismo registro llega dos veces, el servidor no lo vuelve a crear.
--   MySQL admite varios NULL en un índice único, así que los registros viejos (sin id_cliente) no chocan.
--   Es VARCHAR(36) y no CHAR(36): el conector de MySQL lee CHAR(36) como Guid y el servidor espera texto.
--
-- Todo con valor por defecto o nulo: los partidos existentes quedan como SIN_INICIAR y sin autor,
-- y el servidor publicado sigue funcionando. Aplicar ANTES de publicar el servidor de la Fase 8.

ALTER TABLE partido
    ADD COLUMN estado_registro   ENUM('SIN_INICIAR','EN_VIVO','CERRADO') NOT NULL DEFAULT 'SIN_INICIAR',
    ADD COLUMN iniciado_en       DATETIME NULL,
    ADD COLUMN cerrado_en        DATETIME NULL,
    ADD COLUMN id_usuario_cierre INT NULL,
    ADD CONSTRAINT fk_partido_usuario_cierre FOREIGN KEY (id_usuario_cierre) REFERENCES usuario (id_usuario) ON DELETE SET NULL;

ALTER TABLE eventopartido
    ADD COLUMN id_usuario_registro INT NULL,
    ADD COLUMN id_cliente          VARCHAR(36) NULL,
    ADD UNIQUE KEY uq_evento_cliente (id_partido, id_cliente),
    ADD CONSTRAINT fk_evento_usuario_registro FOREIGN KEY (id_usuario_registro) REFERENCES usuario (id_usuario) ON DELETE SET NULL;

ALTER TABLE cambio_partido
    ADD COLUMN id_usuario_registro INT NULL,
    ADD COLUMN id_cliente          VARCHAR(36) NULL,
    ADD UNIQUE KEY uq_cambio_cliente (id_partido, id_cliente),
    ADD CONSTRAINT fk_cambio_usuario_registro FOREIGN KEY (id_usuario_registro) REFERENCES usuario (id_usuario) ON DELETE SET NULL;

ALTER TABLE alineacion_jugador
    ADD COLUMN id_usuario_registro INT NULL,
    ADD CONSTRAINT fk_alineacion_usuario_registro FOREIGN KEY (id_usuario_registro) REFERENCES usuario (id_usuario) ON DELETE SET NULL;
