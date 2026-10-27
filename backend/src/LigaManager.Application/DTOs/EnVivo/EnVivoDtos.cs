namespace LigaManager.Application.DTOs.EnVivo;

// Marcadores en vivo (enlace público y dirigente): partidos de hoy y los que estén en vivo.
// Hoy: fecha de Ecuador (yyyy-MM-dd).
public record EnVivoDto(string Hoy, List<PartidoEnVivoDto> Partidos);

// Estado: PorJugar | EnVivo | Final. Goles: null mientras no empieza.
public record PartidoEnVivoDto(
    int     IdPartido,
    int     IdEquipoLocal,
    string  Local,
    string? LogoLocal,
    int     IdEquipoVisitante,
    string  Visitante,
    string? LogoVisitante,
    string  Fecha,
    string? Estadio,
    string  Estado,
    bool    Desierto,
    int?    GolesLocal,
    int?    GolesVisitante,
    RelojEnVivoDto? Reloj,
    List<EventoEnVivoDto> Eventos
);

// Fase: antes | 1T | descanso | 2T | final (la misma del reloj del vocal).
// Segundos: jugados del tiempo en curso en el momento de la respuesta; si Corriendo, la
// pantalla los sigue contando. DuracionMin: minutos de cada tiempo.
public record RelojEnVivoDto(string Fase, int Segundos, bool Corriendo, int DuracionMin);

// Tipo: GOL | GOL_EN_CONTRA | ROJA. Lado: local | visitante (para un gol, el equipo que lo
// suma; para una roja, el del jugador). DobleAmarilla: roja por segunda amarilla.
public record EventoEnVivoDto(int Minuto, string Tipo, string Jugador, string Lado, bool DobleAmarilla);
