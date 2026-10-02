namespace LigaManager.Application.DTOs.Estadisticas;

// ── Módulo A: Posiciones con forma ───────────────────────────────────────────

public record PosicionConFormaDto(
    int    Posicion,
    int    IdEquipo,
    string Equipo,
    int    Pj,
    int    Pg,
    int    Pe,
    int    Pp,
    int    Gf,
    int    Gc,
    int    Dg,
    int    Pts,
    bool   Clasificado,
    List<string> Forma   // "V"/"E"/"D", más antiguo primero; hasta los últimos 5 partidos jugados (sin contar desiertos)
);

public record GrupoPosicionesDto(
    int?   IdGrupo,   // null cuando el campeonato no usa grupos
    string? Grupo,
    List<PosicionConFormaDto> Posiciones
);

public record TablaPosicionesDto(
    bool   TieneGrupos,
    List<GrupoPosicionesDto> Grupos
);

// ── Módulo B: Goleadores ─────────────────────────────────────────────────────

public record GoleadorDto(
    int    IdJugador,
    string Jugador,
    string Equipo,
    int    Goles,
    int    PartidosJugados,
    double PromedioPorPartido
);

// ── Módulo B: Tarjetas ────────────────────────────────────────────────────────

public record TarjetasJugadorDto(
    int    IdJugador,
    string Jugador,
    string Equipo,
    int    Amarillas,
    int    Rojas,
    int    Total
);

public record FairPlayEquipoDto(
    int    IdEquipo,
    string Equipo,
    int    Amarillas,
    int    Rojas,
    int    PuntosFairPlay   // amarillas*1 + rojas*3; menor puntaje es mejor
);

public record TarjetasDto(
    List<TarjetasJugadorDto> PorJugador,
    List<FairPlayEquipoDto>  PorEquipo
);

// ── Módulo B: Suspensiones ────────────────────────────────────────────────────

public record SuspensionDto(
    int     IdJugador,
    string  Jugador,
    string  Equipo,
    string  Motivo,              // "5 amarillas acumuladas" | "Roja directa" | "Doble amarilla" | manual (texto libre)
    int?    IdPartidoSancion,    // null en una sanción manual sin partido de origen
    string  FechaPartidoSancion,
    int     PartidosSancion,
    int     PartidosCumplidos,   // cuántos de los PartidosSancion ya los jugó el equipo
    string  Estado,              // "Suspendido" | "Cumplida"
    bool    Manual,               // true si la agregó la comisión disciplinaria, no una tarjeta
    int?    IdSancion = null      // solo en una sanción manual: id para poder eliminarla
);

public record JugadorEnRiesgoDto(
    int    IdJugador,
    string Jugador,
    string Equipo,
    int    AmarillasAcumuladas
);

public record SuspensionesDto(
    List<SuspensionDto>      Sanciones,
    List<JugadorEnRiesgoDto> EnRiesgo
);

// Sanción agregada a mano por la comisión disciplinaria (sin partido de origen).
public record AgregarSancionManualRequest(
    int     IdJugador,
    string  Motivo,
    int     PartidosSancion,
    string? FechaDecision   // yyyy-MM-dd; si no se envía, se usa hoy
);
