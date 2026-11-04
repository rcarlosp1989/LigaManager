-- LigaManager: logo de la liga en el campeonato (sale a ambos lados del acta de juego).
-- campeonato.logo_url: dirección de la imagen (/api/imagenes/{código}). NULL = sin logo.
-- Solo agrega una columna: el servidor actual sigue funcionando con el script aplicado.
-- Ejecutar una sola vez, en Railway (y en la base local), ANTES de fusionar el PR.

ALTER TABLE campeonato
    ADD COLUMN logo_url VARCHAR(200) NULL;

-- Comprobación: debe mostrar la columna nueva.
SHOW COLUMNS FROM campeonato LIKE 'logo_url';
