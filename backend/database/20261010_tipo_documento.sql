-- LigaManager: tipo de documento de jugadores y árbitros.
--
-- Agrega persona.tipo_identificacion: CEDULA (ecuatoriana), EXTRANJERO (documento de otro
-- país, solo números) o PASAPORTE. Las personas que ya existen quedan como CEDULA.
-- Compatible con el servidor anterior (la columna tiene valor por defecto).
-- Ejecutar una sola vez, en Railway, ANTES de fusionar el PR.

ALTER TABLE persona
    ADD COLUMN tipo_identificacion ENUM('CEDULA','EXTRANJERO','PASAPORTE') NOT NULL DEFAULT 'CEDULA' AFTER cedula;

-- Comprobación: debe mostrar la columna nueva.
SHOW COLUMNS FROM persona LIKE 'tipo_identificacion';

-- Informativo: cuántos documentos de hoy NO cumplen el formato de cédula ecuatoriana
-- (10 números). No se cambian solos; al editar cada jugador, la app pedirá corregirlo
-- o elegir el tipo correcto (extranjero o pasaporte).
SELECT COUNT(*) AS documentos_a_revisar
FROM persona
WHERE cedula NOT REGEXP '^[0-9]{10}$'
  AND cedula NOT LIKE 'AR-%'
  AND cedula NOT LIKE 'LEGACY-%';
