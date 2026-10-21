-- Reversa de 20261021_enlace_publico.sql.
-- Publica primero el servidor anterior (revierte el PR) y después ejecuta este script.
-- Los enlaces públicos que existan dejan de funcionar.

ALTER TABLE campeonato
    DROP INDEX uq_campeonato_token_publico,
    DROP COLUMN token_publico;
