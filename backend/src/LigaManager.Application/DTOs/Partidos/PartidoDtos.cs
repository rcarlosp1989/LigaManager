namespace LigaManager.Application.DTOs.Partidos;

public record PartidoDto(
    int     IdPartido,
    int     IdJornada,
    int     Numero,
    string  EquipoLocal,
    int     IdEquipoLocal,
    string  EquipoVisitante,
    int     IdEquipoVisitante,
    string  Fecha,
    bool    Jugado,
    string  Estado,
    string? Estadio,
    string? Arbitro
);

public record PartidoDetalleDto(
    int     IdPartido,
    int     IdJornada,
    int     Numero,
    string  EquipoLocal,
    int     IdEquipoLocal,
    string  EquipoVisitante,
    int     IdEquipoVisitante,
    string  Fecha,
    bool    Jugado,
    int?    GolesLocal,
    int?    GolesVisitante,
    string  Estado,
    string? Estadio,
    string? Arbitro,
    List<DesignacionPartidoDto> Oficiales,
    List<EventoPartidoDto> Eventos
);

public record DesignacionPartidoDto(
    int    IdCargo,
    string Cargo,
    int    IdArbitro,
    string Arbitro
);

public record EventoPartidoDto(
    int     IdEvento,
    string  TipoEvento,
    string  Jugador,
    int     IdJugador,
    int     Minuto
);

public record CreatePartidoRequest(
    int    IdEquipoLocal,
    int    IdEquipoVisitante,
    string Fecha,
    int?   IdEstadio,
    int?   IdArbitro,
    List<DesignacionPartidoRequest>? Oficiales = null
);

public record EditarPartidoRequest(
    string Fecha,
    int?   IdEstadio,
    int?   IdArbitro,
    int?   IdEquipoLocal,
    int?   IdEquipoVisitante,
    List<DesignacionPartidoRequest>? Oficiales = null
);

public record DesignacionPartidoRequest(int IdCargo, int IdArbitro);

public record RegistrarEventoRequest(
    int    IdJugador,
    string TipoEvento,     // GOL, TARJETA_AMARILLA, TARJETA_ROJA
    int    Minuto
);
public record MarcarJugadoRequest(bool Jugado); 
