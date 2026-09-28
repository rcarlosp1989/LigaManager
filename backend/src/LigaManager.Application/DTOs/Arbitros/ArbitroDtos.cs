namespace LigaManager.Application.DTOs.Arbitros;

public record ArbitroListDto(
    int     IdArbitro,
    string  Nombre,
    string  Apellido,
    string  Pais,
    string? Provincia,
    string? Canton
);

public record ArbitroDetalleDto(
    int     IdArbitro,
    int     IdPersona,
    string  Nombre,
    string  Apellido,
    string  Cedula,
    string  FechaNac,
    int     IdPais,
    string  Pais,
    int?    IdProvincia,
    string? Provincia,
    int?    IdCanton,
    string? Canton
);

public record CreateArbitroRequest(
    string Nombre,
    string Apellido,
    string Cedula,
    string FechaNac,    // yyyy-MM-dd
    int    IdPais,
    int?   IdCanton
);
