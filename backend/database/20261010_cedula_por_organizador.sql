-- LigaManager: la cédula deja de ser única en todo el sistema.
--
-- Antes: una persona (jugador o árbitro) con una cédula podía existir una sola vez en la base.
-- Eso impedía que un jugador registrado en la liga de un organizador se registrara en la de
-- otro, y que un árbitro trabajara para dos organizadores.
--
-- Ahora: cada organizador tiene su propia ficha. El servidor revisa que la cédula no se
-- repita dentro de los jugadores (o de los árbitros) del mismo organizador.
-- Se mantiene un índice normal en cédula para que las búsquedas sigan siendo rápidas.
--
-- Compatible con el servidor anterior: solo quita una restricción.
-- Ejecutar una sola vez, en Railway, ANTES de fusionar el PR.

ALTER TABLE persona
    DROP INDEX uq_persona_cedula,
    ADD INDEX idx_persona_cedula (cedula);

-- Comprobación: debe mostrar idx_persona_cedula con Non_unique = 1.
SHOW INDEX FROM persona WHERE Column_name = 'cedula';
