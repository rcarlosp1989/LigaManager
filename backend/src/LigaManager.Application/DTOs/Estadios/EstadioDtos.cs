namespace LigaManager.Application.DTOs.Estadios;

public record EstadioListDto(
    int    IdEstadio,
    string Nombre,
    string Ciudad,
    string Pais
);

public record CreateEstadioRequest(
    string Nombre,
    int    IdCiudad
);

public record UpdateEstadioRequest(
    string Nombre,
    int    IdCiudad
);
