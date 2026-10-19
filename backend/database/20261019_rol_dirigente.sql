-- Rol Dirigente: acceso de solo lectura a un campeonato, asociado a un equipo.
--
-- 1) Rol nuevo DIRIGENTE. Los usuarios existentes no cambian.
-- 2) campeonato_dirigente: qué dirigente puede ver qué campeonato y de qué equipo es.
-- 3) invitacion_dirigente: enlace de un solo uso (se guarda solo el hash SHA-256 del código).
--
-- Ejecutar una sola vez, en Railway, ANTES de fusionar el PR.
-- No modifica ni borra nada existente: el servidor actual sigue funcionando con el script aplicado.

ALTER TABLE usuario
    MODIFY COLUMN rol ENUM('ADMIN','ARBITRO','VEEDOR','DELEGADO','ORGANIZADOR','VOCAL','DIRIGENTE') NOT NULL DEFAULT 'ADMIN';

CREATE TABLE IF NOT EXISTS campeonato_dirigente (
    id_habilitacion INT NOT NULL AUTO_INCREMENT,
    id_campeonato   INT NOT NULL,
    id_usuario      INT NOT NULL,
    id_equipo       INT NOT NULL,
    activo          TINYINT(1) NOT NULL DEFAULT 1,
    creado_por      INT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_habilitacion),
    KEY idx_cd_usuario (id_usuario),
    KEY idx_cd_campeonato (id_campeonato),
    CONSTRAINT fk_cd_campeonato FOREIGN KEY (id_campeonato) REFERENCES campeonato (id_campeonato) ON DELETE CASCADE,
    CONSTRAINT fk_cd_usuario    FOREIGN KEY (id_usuario)    REFERENCES usuario (id_usuario)       ON DELETE CASCADE,
    CONSTRAINT fk_cd_equipo     FOREIGN KEY (id_equipo)     REFERENCES equipo (id_equipo)         ON DELETE CASCADE,
    CONSTRAINT fk_cd_creado_por FOREIGN KEY (creado_por)    REFERENCES usuario (id_usuario)       ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invitacion_dirigente (
    id_invitacion INT NOT NULL AUTO_INCREMENT,
    id_campeonato INT NOT NULL,
    id_equipo     INT NOT NULL,
    token_hash    CHAR(64) NOT NULL,
    creada_por    INT NOT NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    vence_en      DATETIME NOT NULL,
    usada_por     INT NULL,
    usada_en      DATETIME NULL,
    revocada      TINYINT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (id_invitacion),
    UNIQUE KEY uq_invitacion_dirigente_token (token_hash),
    KEY idx_id_campeonato (id_campeonato),
    CONSTRAINT fk_id_campeonato FOREIGN KEY (id_campeonato) REFERENCES campeonato (id_campeonato) ON DELETE CASCADE,
    CONSTRAINT fk_id_equipo     FOREIGN KEY (id_equipo)     REFERENCES equipo (id_equipo)         ON DELETE CASCADE,
    CONSTRAINT fk_id_creada_por FOREIGN KEY (creada_por)    REFERENCES usuario (id_usuario)       ON DELETE CASCADE,
    CONSTRAINT fk_id_usada_por  FOREIGN KEY (usada_por)     REFERENCES usuario (id_usuario)       ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Comprobación: deben salir las 2 tablas nuevas.
SHOW TABLES LIKE '%dirigente%';
