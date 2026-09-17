public record CampeonatoDetalleDto(
    int    IdCampeonato,
    string Nombre,
    int    Anio,
    string FechaInicio,
    string FechaFin,
    string Estado,
    int    IdTipoPartido,
    string TipoPartido,
    int    IdModalidad,
    string Modalidad,
    List<EquipoEnCampeonatoDto> Equipos
);
