-- LigaManager: equipos y campeonatos privados por organizador.
-- Ejecutar una sola vez sobre una base existente.
-- Los datos actuales se asignan al usuario administrador con id 1.

ALTER TABLE equipo
    ADD COLUMN id_usuario_creador INT NULL,
    ADD INDEX idx_equipo_usuario (id_usuario_creador),
    ADD CONSTRAINT fk_equipo_usuario FOREIGN KEY (id_usuario_creador)
        REFERENCES usuario(id_usuario) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE campeonato
    ADD COLUMN id_usuario_creador INT NULL,
    ADD INDEX idx_campeonato_usuario (id_usuario_creador),
    ADD CONSTRAINT fk_campeonato_usuario FOREIGN KEY (id_usuario_creador)
        REFERENCES usuario(id_usuario) ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE equipo SET id_usuario_creador = 1 WHERE id_usuario_creador IS NULL;
UPDATE campeonato SET id_usuario_creador = 1 WHERE id_usuario_creador IS NULL;

ALTER TABLE equipo
    DROP INDEX nombre,
    ADD UNIQUE KEY uq_equipo_usuario_nombre (id_usuario_creador, nombre);

