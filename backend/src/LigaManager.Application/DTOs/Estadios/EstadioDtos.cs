namespace LigaManager.Application.DTOs.Estadios;

public record EstadioListDto(
    int     IdEstadio,
    string  Nombre,
    int     IdPais,
    string  Pais,
    int?    IdProvincia,
    string? Provincia,
    int?    IdCanton,
    string? Canton
);

public record CreateEstadioRequest(
    string Nombre,
    int    IdPais,
    int?   IdCanton
);

public record UpdateEstadioRequest(
    string Nombre,
    int    IdPais,
    int?   IdCanton
);
