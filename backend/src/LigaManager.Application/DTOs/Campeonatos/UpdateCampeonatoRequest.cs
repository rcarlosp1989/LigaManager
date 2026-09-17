public record UpdateCampeonatoRequest(
    string Nombre,
    int    Anio,
    string FechaInicio,
    string FechaFin,
    string Estado,        // Planificado | EnCurso | Finalizado
    int    IdTipoPartido,
    int    IdModalidad
);
