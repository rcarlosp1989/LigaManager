-- LigaManager: enlace para aficionados (el que va en el flyer de la jornada).
-- campeonato.token_aficionados: código del enlace /publico/{código}. Con este enlace se ven los
-- marcadores en vivo, resultados, posiciones y goleadores; NO tarjetas ni suspensiones (esas
-- quedan en el enlace público completo, para los dirigentes). NULL = desactivado.
-- Los campeonatos que ya tienen enlace público reciben su enlace para aficionados.
-- Solo agrega una columna: el servidor actual sigue funcionando con el script aplicado.
-- Ejecutar una sola vez, en Railway, ANTES de fusionar el PR.

ALTER TABLE campeonato
    ADD COLUMN token_aficionados VARCHAR(32) NULL,
    ADD UNIQUE KEY uq_campeonato_token_aficionados (token_aficionados);

-- Código aleatorio de 22 caracteres (letras y números) para cada campeonato con enlace público.
UPDATE campeonato
SET token_aficionados = LEFT(REPLACE(REPLACE(REPLACE(TO_BASE64(RANDOM_BYTES(24)), '+', ''), '/', ''), '=', ''), 22)
WHERE token_publico IS NOT NULL AND token_aficionados IS NULL;

-- Comprobación: la columna nueva y cuántos campeonatos tienen cada enlace.
SHOW COLUMNS FROM campeonato LIKE 'token_aficionados';
SELECT COUNT(token_publico) AS con_enlace_publico, COUNT(token_aficionados) AS con_enlace_aficionados FROM campeonato;
