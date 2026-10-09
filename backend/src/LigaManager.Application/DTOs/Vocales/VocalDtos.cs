namespace LigaManager.Application.DTOs.Vocales;
using LigaManager.Application.DTOs.Equipos;
using LigaManager.Application.DTOs.Partidos;

// ── Invitaciones ─────────────────────────────────────────────────────────────

// Tipo: "Titular" (mientras dure el campeonato) o "Reemplazo" (solo el día Fecha, yyyy-MM-dd).
public record CrearInvitacionRequest(string Tipo, string? Fecha);

// El código se devuelve solo aquí; el servidor guarda únicamente su hash.
public record InvitacionCreadaDto(
    int     IdInvitacion,
    string  Codigo,
    string  Tipo,
    string? SoloFecha,
    string  VenceEn        // hora de Ecuador, yyyy-MM-dd HH:mm
);

public record VocalDelCampeonatoDto(
    int     IdUsuario,
    string  Nombre,
    string  Email,
    string  Tipo,
    string? SoloFecha
);

public record InvitacionPendienteDto(
    int     IdInvitacion,
    string  Tipo,
    string? SoloFecha,
    string  VenceEn,
    string  CreadaPor
);

public record VocalesCampeonatoDto(
    List<VocalDelCampeonatoDto>  Vocales,
    List<InvitacionPendienteDto> Invitaciones
);

// Lo que ve quien abre el enlace de la invitación, antes de aceptarla.
public record InfoInvitacionDto(
    string  Campeonato,
    string  Organizador,
    string  Tipo,
    string? SoloFecha,
    string  VenceEn,
    bool    Vigente,
    string? Motivo
);

// Sin sesión: Email y Password (y Nombre si la cuenta es nueva). Con sesión de vocal: vacío.
public record AceptarInvitacionRequest(string? Nombre, string? Email, string? Password);

// ── Inicio y partido del vocal ───────────────────────────────────────────────

public record VocalPartidoDto(
    int     IdPartido,
    int     IdJornada,
    int     IdCampeonato,
    string  Campeonato,
    string  Jornada,
    string  EquipoLocal,
    string  EquipoVisitante,
    string  Fecha,          // yyyy-MM-dd HH:mm
    string? Estadio,
    bool    Jugado,
    bool    EsHoy
);

public record VocalCampeonatoDto(
    int     IdCampeonato,
    string  Nombre,
    string  Tipo,
    string? SoloFecha,
    string  FechaFin
);

public record VocalInicioDto(
    string                   Hoy,
    List<VocalPartidoDto>    PartidosHoy,
    List<VocalPartidoDto>    Proximos,
    List<VocalCampeonatoDto> Campeonatos
);

public record VocalPartidoDetalleDto(
    int               IdCampeonato,
    string            Campeonato,
    PartidoDetalleDto Partido,
    EquipoDetalleDto  Local,
    EquipoDetalleDto  Visitante
);

public record CerrarPartidoVocalRequest(string? Observaciones);

public record DelegarRequest(string Fecha);
