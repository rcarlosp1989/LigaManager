-- LigaManager: enlace público del campeonato (solo lectura, sin cuenta).
-- campeonato.token_publico: código del enlace /publico/{código}. NULL = desactivado.
-- Solo agrega una columna: el servidor actual sigue funcionando con el script aplicado.
-- Ejecutar una sola vez, en Railway, ANTES de fusionar el PR.

ALTER TABLE campeonato
    ADD COLUMN token_publico VARCHAR(32) NULL,
    ADD UNIQUE KEY uq_campeonato_token_publico (token_publico);

-- Comprobación: debe mostrar la columna nueva.
SHOW COLUMNS FROM campeonato LIKE 'token_publico';
