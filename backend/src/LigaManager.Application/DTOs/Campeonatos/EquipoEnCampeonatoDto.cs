public record EquipoEnCampeonatoDto(int IdEquipo, string Nombre, string Pais);
public record CreateCampeonatoRequest(
    string Nombre,
    int    Anio,
    string FechaInicio,   // formato yyyy-MM-dd
    string FechaFin,
    int    IdTipoPartido,
    int    IdModalidad
);
