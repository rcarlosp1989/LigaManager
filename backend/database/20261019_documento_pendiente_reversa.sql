-- Reversa de 20261019_documento_pendiente.sql.
-- Publica primero el servidor anterior (revierte el PR) y después ejecuta este script.
--
-- Falla a propósito si todavía hay jugadores con documento PENDIENTE, para no perder datos.
-- Para revisarlos antes:
--   SELECT p.id_persona, p.nombre, p.apellido FROM persona p WHERE p.tipo_identificacion = 'PENDIENTE';
-- Complétales el documento desde la app (o con un UPDATE) y vuelve a ejecutar.

ALTER TABLE persona
    MODIFY COLUMN tipo_identificacion ENUM('CEDULA','EXTRANJERO','PASAPORTE') NOT NULL DEFAULT 'CEDULA';
