-- LigaManager: tipo de documento «Pendiente» para jugadores registrados sin documento.
-- Se guarda sin número y se completa después desde Editar jugador.
-- Solo agrega un valor a la lista: no cambia ni borra datos.
-- Ejecutar una sola vez, en Railway, ANTES de fusionar el PR.

ALTER TABLE persona
    MODIFY COLUMN tipo_identificacion ENUM('CEDULA','EXTRANJERO','PASAPORTE','PENDIENTE') NOT NULL DEFAULT 'CEDULA';

-- Comprobación: el tipo debe incluir PENDIENTE.
SHOW COLUMNS FROM persona LIKE 'tipo_identificacion';
