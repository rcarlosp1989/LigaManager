namespace LigaManager.Application.DTOs.Arbitros;

public record ArbitroListDto(
    int    IdArbitro,
    string Nombre,
    string Apellido,
    string Ciudad,
    string Pais
);

public record ArbitroDetalleDto(
    int    IdArbitro,
    int    IdPersona,
    string Nombre,
    string Apellido,
    string Cedula,
    string FechaNac,
    string Ciudad,
    string Pais
);

public record CreateArbitroRequest(
    string Nombre,
    string Apellido,
    string Cedula,
    string FechaNac,    // yyyy-MM-dd
    int    IdCiudad
);
