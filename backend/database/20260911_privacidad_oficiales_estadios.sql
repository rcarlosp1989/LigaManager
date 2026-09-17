-- Propiedad por organizador para oficiales y estadios.
ALTER TABLE arbitro
    ADD COLUMN id_usuario_creador INT NULL,
    ADD INDEX idx_arbitro_usuario (id_usuario_creador),
    ADD CONSTRAINT fk_arbitro_usuario FOREIGN KEY (id_usuario_creador)
        REFERENCES usuario(id_usuario) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE estadio
    ADD COLUMN id_usuario_creador INT NULL,
    ADD INDEX idx_estadio_usuario (id_usuario_creador),
    ADD CONSTRAINT fk_estadio_usuario FOREIGN KEY (id_usuario_creador)
        REFERENCES usuario(id_usuario) ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE arbitro SET id_usuario_creador = 1 WHERE id_usuario_creador IS NULL;
UPDATE estadio SET id_usuario_creador = 1 WHERE id_usuario_creador IS NULL;
