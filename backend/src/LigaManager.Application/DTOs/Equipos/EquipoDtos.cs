namespace LigaManager.Application.DTOs.Equipos;

public record EquipoListDto(
    int    IdEquipo,
    string Nombre,
    string Pais,
    int    TotalJugadores
);

public record EquipoDetalleDto(
    int    IdEquipo,
    string Nombre,
    int    IdPais,
    string Pais,
    List<JugadorEnEquipoDto> Jugadores
);

public record JugadorEnEquipoDto(
    int    IdJugador,
    string Nombre,
    string Apellido,
    string FechaDesde,
    string? FechaHasta,
    int?   Dorsal,
    string Cedula,
    string? Posicion,
    int    Edad
);

public record CreateEquipoRequest(string Nombre, int IdPais);
public record UpdateEquipoRequest(string Nombre, int IdPais);