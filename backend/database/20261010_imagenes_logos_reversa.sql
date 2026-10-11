-- Reversa de 20261010_imagenes_logos.sql. ¡Borra todos los logos y las fotos guardadas!
-- Revertir también el servidor (el nuevo usa esta tabla y columna).
ALTER TABLE equipo DROP COLUMN logo_url;
UPDATE persona SET foto_url = NULL WHERE foto_url LIKE '/api/imagenes/%';
DROP TABLE imagen;
