-- Reversa de 20261010_cedula_por_organizador.sql: vuelve a hacer única la cédula.
--
-- Solo funciona si no hay cédulas repetidas. Si ya se registró la misma persona en dos
-- ligas, esta consulta las muestra y hay que resolverlas antes:
--   SELECT cedula, COUNT(*) FROM persona GROUP BY cedula HAVING COUNT(*) > 1;
--
-- Revertir también el servidor (el anterior no revisa por organizador).

ALTER TABLE persona
    DROP INDEX idx_persona_cedula,
    ADD UNIQUE KEY uq_persona_cedula (cedula);
