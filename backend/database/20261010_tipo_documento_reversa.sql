-- Reversa de 20261010_tipo_documento.sql: quita el tipo de documento.
-- Revertir también el servidor (el nuevo lee esta columna).
ALTER TABLE persona DROP COLUMN tipo_identificacion;
