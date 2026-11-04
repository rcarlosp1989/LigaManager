-- Reversa de 20261104_logo_campeonato.sql.
-- Publique primero el servidor anterior (revierta el PR) y después ejecute este script.
-- Las imágenes de los logos quedan en la tabla imagen sin uso.

ALTER TABLE campeonato
    DROP COLUMN logo_url;
