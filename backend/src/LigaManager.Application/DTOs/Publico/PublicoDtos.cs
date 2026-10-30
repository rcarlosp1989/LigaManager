namespace LigaManager.Application.DTOs.Publico;
using LigaManager.Application.DTOs.Dirigentes;

// Enlaces del campeonato (organizador). Null = desactivado.
//  - Token: enlace público completo (con tarjetas y suspensiones), para los dirigentes.
//  - TokenAficionados: enlace del flyer, sin tarjetas ni suspensiones.
public record EnlacePublicoDto(string? Token, string? TokenAficionados = null);

// Lo que ve cualquiera con el enlace público.
public record PublicoCampeonatoDto(
    string                   Nombre,
    int                      Anio,
    string                   Estado,
    string                   FechaInicio,
    string                   FechaFin,
    string                   Modalidad,
    string                   Organizacion,
    List<DirigenteEquipoDto> Equipos,
    bool                     Aficionados       = false, // abierto con el enlace para aficionados
    string?                  EnlaceAficionados = null   // con el enlace completo: código del de aficionados (flyer)
);

public record PublicoJornadaDto(
    int                       IdJornada,
    int                       Numero,
    string                    Instancia,
    string?                   Grupo,
    List<DirigentePartidoDto> Partidos
);
