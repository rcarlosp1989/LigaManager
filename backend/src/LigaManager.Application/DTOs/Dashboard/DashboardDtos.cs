namespace LigaManager.Application.DTOs.Dashboard;

public record DashboardDto(
    int                     TotalCampeonatos,
    int                     CampeonatosEnCurso,
    int                     TotalEquipos,
    int                     TotalJugadores,
    List<ProximoPartidoDto> ProximosPartidos,
    List<UltimoResultadoDto> UltimosResultados
);

public record ProximoPartidoDto(
    int    IdPartido,
    int    IdCampeonato,
    string Campeonato,
    string Jornada,
    string EquipoLocal,
    string EquipoVisitante,
    string Fecha,
    string Estadio
);

public record UltimoResultadoDto(
    int    IdPartido,
    int    IdCampeonato,
    string Campeonato,
    string Jornada,
    string EquipoLocal,
    int    GolesLocal,
    string EquipoVisitante,
    int    GolesVisitante,
    string Fecha
);
