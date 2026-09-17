namespace LigaManager.Application.DTOs.Jugadores;

public record JugadorListDto(
    int     IdJugador,
    string  Nombre,
    string  Apellido,
    string  Cedula,
    string  FechaNac,
    int     Edad,
    string  Ciudad,
    string? EquipoActual,
    int?    Dorsal,
    string? Posicion,
    string? FotoUrl
);

public record JugadorDetalleDto(
    int    IdJugador,
    int    IdPersona,
    string Nombre,
    string Apellido,
    string Cedula,
    string FechaNac,
    int    Edad,
    int    IdCiudad,
    string Ciudad,
    string Pais,
    string? FotoUrl,
    List<HistorialEquipoDto> Historial
);

public record HistorialEquipoDto(
    int     IdEquipo,
    string  Equipo,
    string  FechaDesde,
    string? FechaHasta,
    int?    Dorsal,
    string? Posicion
);

public record CreateJugadorRequest(
    string Nombre,
    string Apellido,
    string Cedula,
    string FechaNac,
    int    IdCiudad,
    int    IdEquipo,
    string FechaDesde,
    int?   Dorsal,
    string? Posicion,
    string? FotoUrl
);

public record UpdateJugadorRequest(
    string Nombre,
    string Apellido,
    string Cedula,
    string FechaNac,
    int    IdCiudad,
    string? FotoUrl,
    string? Posicion
);

public record UpdateDorsalRequest(
    int? Dorsal
);

public record VincularEquipoRequest(
    int     IdEquipo,
    string  FechaDesde,
    string? FechaHasta,
    int?    Dorsal,
    string? Posicion
);
