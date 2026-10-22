namespace LigaManager.Application.DTOs.Publico;
using LigaManager.Application.DTOs.Dirigentes;

// Enlace público del campeonato (organizador). Token null = desactivado.
public record EnlacePublicoDto(string? Token);

// Lo que ve cualquiera con el enlace público.
public record PublicoCampeonatoDto(
    string                   Nombre,
    int                      Anio,
    string                   Estado,
    string                   FechaInicio,
    string                   FechaFin,
    string                   Modalidad,
    string                   Organizacion,
    List<DirigenteEquipoDto> Equipos
);

public record PublicoJornadaDto(
    int                       IdJornada,
    int                       Numero,
    string                    Instancia,
    string?                   Grupo,
    List<DirigentePartidoDto> Partidos
);
