-- Reversa de 20261030_enlace_aficionados.sql.
-- Publique primero el servidor anterior (revierta el PR) y después ejecute este script.
-- Los enlaces para aficionados dejan de funcionar; el enlace público completo no cambia.

ALTER TABLE campeonato
    DROP INDEX uq_campeonato_token_aficionados,
    DROP COLUMN token_aficionados;
