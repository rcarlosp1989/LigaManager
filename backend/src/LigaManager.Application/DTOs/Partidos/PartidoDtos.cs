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
    List<EventoPartidoDto> Eventos,
    List<AlineacionJugadorDto> AlineacionLocal,
    List<AlineacionJugadorDto> AlineacionVisitante,
    List<CambioPartidoDto> Cambios,
    string? Grupo,
    bool    Desierto,
    string? Observaciones,
    bool    PerdidaReglamento,
    int?    IdEquipoSancionado,
    // Fase 8: registro en vivo. EstadoRegistro: SinIniciar | EnVivo | Cerrado. Horas de Ecuador.
    string  EstadoRegistro = "SinIniciar",
    string? IniciadoEn     = null,
    string? CerradoEn      = null,
    string? CerradoPor     = null
);

public record AlineacionJugadorDto(
    int     IdAlineacion,
    int     IdJugador,
    string  Jugador,
    bool    Titular,
    int?    Dorsal,
    string? FotoUrl,
    string? RegistradoPor = null
);

public record CambioPartidoDto(
    int    IdCambio,
    int    IdEquipo,
    int    IdJugadorSale,
    string JugadorSale,
    int    IdJugadorEntra,
    string JugadorEntra,
    int    Minuto,
    string? RegistradoPor = null,
    string? IdCliente     = null
);

public record AgregarAlineacionRequest(int IdJugador, bool Titular);

// IdCliente (Fase 8): identificador que manda el modo en vivo; si llega dos veces, no se duplica.
public record RegistrarCambioRequest(int IdJugadorSale, int IdJugadorEntra, int Minuto, string? IdCliente = null);

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
    int     Minuto,
    string? RegistradoPor = null,
    string? IdCliente     = null
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
    string TipoEvento,     // GOL, GOL_EN_CONTRA, TARJETA_AMARILLA, TARJETA_ROJA
    int    Minuto,
    string? IdCliente = null   // Fase 8: identificador del modo en vivo, evita duplicados
);
public record MarcarJugadoRequest(bool Jugado);

// Fase 8: cerrar el registro del partido desde el modo en vivo.
public record CerrarRegistroRequest(string? Observaciones);

public record ActualizarPlanillaRequest(string? Observaciones, bool Desierto, bool PerdidaReglamento = false, int? IdEquipoSancionado = null);
