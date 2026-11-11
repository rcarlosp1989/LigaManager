-- Tablas de pagos como están en producción (antes del script 20261110), con su trigger.
CREATE TABLE conceptopago (
  id_concepto INT NOT NULL AUTO_INCREMENT,
  descripcion VARCHAR(150) NOT NULL,
  PRIMARY KEY (id_concepto),
  UNIQUE KEY descripcion (descripcion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE pago (
  id_pago INT NOT NULL AUTO_INCREMENT,
  id_campeonato INT NOT NULL,
  id_equipo INT NULL,
  id_jugador INT NULL,
  id_concepto INT NOT NULL,
  monto DECIMAL(10,2) NOT NULL,
  fecha DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_pago),
  CONSTRAINT fk_pago_campeonato FOREIGN KEY (id_campeonato) REFERENCES campeonato (id_campeonato) ON DELETE RESTRICT,
  CONSTRAINT fk_pago_concepto FOREIGN KEY (id_concepto) REFERENCES conceptopago (id_concepto) ON DELETE RESTRICT,
  CONSTRAINT fk_pago_equipo FOREIGN KEY (id_equipo) REFERENCES equipo (id_equipo) ON DELETE RESTRICT,
  CONSTRAINT fk_pago_jugador FOREIGN KEY (id_jugador) REFERENCES jugador (id_jugador) ON DELETE RESTRICT,
  CONSTRAINT chk_pago_monto CHECK (monto > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE abono (
  id_abono INT NOT NULL AUTO_INCREMENT,
  id_pago INT NOT NULL,
  monto DECIMAL(10,2) NOT NULL,
  fecha DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_abono),
  CONSTRAINT fk_abono_pago FOREIGN KEY (id_pago) REFERENCES pago (id_pago) ON DELETE CASCADE,
  CONSTRAINT chk_abono_monto CHECK (monto > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
DELIMITER $$
CREATE TRIGGER trg_pago_destino_insert BEFORE INSERT ON pago FOR EACH ROW
BEGIN
    IF NOT (
        (NEW.id_equipo IS NOT NULL AND NEW.id_jugador IS NULL) OR
        (NEW.id_equipo IS NULL     AND NEW.id_jugador IS NOT NULL)
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'El pago debe tener destino exclusivo: equipo O jugador, no ambos ni ninguno.';
    END IF;
END$$
CREATE TRIGGER trg_pago_destino_update BEFORE UPDATE ON pago FOR EACH ROW
BEGIN
    IF NOT (
        (NEW.id_equipo IS NOT NULL AND NEW.id_jugador IS NULL) OR
        (NEW.id_equipo IS NULL     AND NEW.id_jugador IS NOT NULL)
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'El pago debe tener destino exclusivo: equipo O jugador, no ambos ni ninguno.';
    END IF;
END$$
DELIMITER ;
