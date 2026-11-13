namespace LigaManager.Application.DTOs.Jornadas;
using LigaManager.Application.DTOs.Partidos;


public record JornadaListDto(
    int    IdJornada,
    int    Numero,
    int    IdCampeonato,
    string Instancia,
    string? Grupo,
    int    TotalPartidos,
    string? EquipoLibre,
    // Para la tira de jornadas del celular: día del primer partido (yyyy-MM-dd) y cuántos se jugaron.
    string? Fecha = null,
    int    Jugados = 0
);

public record JornadaDetalleDto(
    int    IdJornada,
    int    Numero,
    int    IdCampeonato,
    int    IdInstancia,
    string Instancia,
    int?   IdGrupo,
    string? Grupo,
    string? EquipoLibre,
    List<PartidoDetalleDto> Partidos
);

public record CreateJornadaRequest(
    int  Numero,
    int  IdInstancia,
    int? IdGrupo
);
