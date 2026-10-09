-- Fase 7: rol Vocal (juez de mesa) habilitado por campeonato.
--
-- 1) Rol nuevo VOCAL. Los usuarios existentes no cambian.
-- 2) campeonato_vocal: qué vocal puede registrar partidos de qué campeonato.
--    - TITULAR: mientras dure el campeonato (hasta fecha_fin); registra solo el día de cada partido.
--    - REEMPLAZO: solo el día indicado en solo_fecha (cuando el titular delega).
-- 3) invitacion_vocal: códigos de invitación. Se guarda solo el hash SHA-256 del código.
--    - TITULAR: vence al terminar el campeonato; sirve una vez (para crear o vincular la cuenta).
--    - REEMPLAZO: vence al terminar solo_fecha; sirve una vez.
--
-- Compatible con la versión publicada: tablas nuevas y un valor más en el ENUM.
-- Aplicar ANTES de publicar el servidor de la Fase 7.

ALTER TABLE usuario
    MODIFY COLUMN rol ENUM('ADMIN','ARBITRO','VEEDOR','DELEGADO','ORGANIZADOR','VOCAL') NOT NULL DEFAULT 'ADMIN';

CREATE TABLE IF NOT EXISTS campeonato_vocal (
    id_habilitacion INT NOT NULL AUTO_INCREMENT,
    id_campeonato   INT NOT NULL,
    id_usuario      INT NOT NULL,
    tipo            ENUM('TITULAR','REEMPLAZO') NOT NULL DEFAULT 'TITULAR',
    solo_fecha      DATE NULL,
    activo          TINYINT(1) NOT NULL DEFAULT 1,
    creado_por      INT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_habilitacion),
    KEY idx_cv_usuario (id_usuario),
    KEY idx_cv_campeonato (id_campeonato),
    CONSTRAINT fk_cv_campeonato  FOREIGN KEY (id_campeonato) REFERENCES campeonato (id_campeonato) ON DELETE CASCADE,
    CONSTRAINT fk_cv_usuario     FOREIGN KEY (id_usuario)    REFERENCES usuario (id_usuario)       ON DELETE CASCADE,
    CONSTRAINT fk_cv_creado_por  FOREIGN KEY (creado_por)    REFERENCES usuario (id_usuario)       ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invitacion_vocal (
    id_invitacion INT NOT NULL AUTO_INCREMENT,
    id_campeonato INT NOT NULL,
    tipo          ENUM('TITULAR','REEMPLAZO') NOT NULL DEFAULT 'TITULAR',
    solo_fecha    DATE NULL,
    token_hash    CHAR(64) NOT NULL,
    creada_por    INT NOT NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    vence_en      DATETIME NOT NULL,
    usada_por     INT NULL,
    usada_en      DATETIME NULL,
    revocada      TINYINT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (id_invitacion),
    UNIQUE KEY uq_invitacion_token (token_hash),
    KEY idx_iv_campeonato (id_campeonato),
    CONSTRAINT fk_iv_campeonato FOREIGN KEY (id_campeonato) REFERENCES campeonato (id_campeonato) ON DELETE CASCADE,
    CONSTRAINT fk_iv_creada_por FOREIGN KEY (creada_por)    REFERENCES usuario (id_usuario)       ON DELETE CASCADE,
    CONSTRAINT fk_iv_usada_por  FOREIGN KEY (usada_por)     REFERENCES usuario (id_usuario)       ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
