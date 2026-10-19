namespace LigaManager.Application.DTOs.Dirigentes;

// ── Invitaciones (organizador) ───────────────────────────────────────────────

public record CrearInvitacionDirigenteRequest(int IdEquipo);

// El código se devuelve solo aquí; el servidor guarda únicamente su hash.
public record InvitacionDirigenteCreadaDto(
    int    IdInvitacion,
    string Codigo,
    int    IdEquipo,
    string Equipo,
    string VenceEn          // hora de Ecuador, yyyy-MM-dd HH:mm
);

public record DirigenteDelCampeonatoDto(
    int    IdUsuario,
    string Nombre,
    string Email,
    int    IdEquipo,
    string Equipo,
    string Desde            // yyyy-MM-dd
);

public record InvitacionDirigentePendienteDto(
    int    IdInvitacion,
    int    IdEquipo,
    string Equipo,
    string VenceEn,
    string CreadaPor
);

public record DirigentesCampeonatoDto(
    List<DirigenteDelCampeonatoDto>       Dirigentes,
    List<InvitacionDirigentePendienteDto> Invitaciones
);

// Lo que ve quien abre el enlace, antes de aceptarlo.
public record InfoInvitacionDirigenteDto(
    string  Campeonato,
    string  Organizador,
    string  Equipo,
    string  VenceEn,
    bool    Vigente,
    string? Motivo
);

// ── Vista del dirigente ──────────────────────────────────────────────────────

public record DirigenteCampeonatoDto(
    int     IdCampeonato,
    string  Nombre,
    int     Anio,
    string  Estado,
    string  FechaInicio,
    string  FechaFin,
    int     IdEquipo,
    string  Equipo,
    string? LogoEquipo
);

public record DirigenteInicioDto(List<DirigenteCampeonatoDto> Campeonatos);

public record DirigentePartidoDto(
    int     IdPartido,
    int     IdJornada,
    int     NumeroJornada,
    string  Local,
    string  Visitante,
    string? LogoLocal,
    string? LogoVisitante,
    string  Fecha,          // yyyy-MM-dd HH:mm
    string? Estadio,
    bool    Jugado,
    bool    Desierto,
    int?    GolesLocal,
    int?    GolesVisitante
);

public record DirigenteEquipoDto(int IdEquipo, string Nombre, string Pais, string? LogoUrl);

// Mismo contenido que el detalle del campeonato que usan los reportes (lista de equipos),
// más el equipo del dirigente y sus partidos.
public record DirigenteCampeonatoDetalleDto(
    int                       IdCampeonato,
    string                    Nombre,
    int                       Anio,
    string                    Estado,
    string                    FechaInicio,
    string                    FechaFin,
    string                    Modalidad,
    int                       IdEquipoPropio,
    string                    EquipoPropio,
    string?                   LogoEquipoPropio,
    List<DirigenteEquipoDto>  Equipos,
    List<DirigentePartidoDto> Proximos,     // de su equipo, desde hoy
    List<DirigentePartidoDto> Ultimos       // de su equipo, ya jugados
);
