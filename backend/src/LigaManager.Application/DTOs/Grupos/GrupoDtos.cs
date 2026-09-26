namespace LigaManager.Application.DTOs.Grupos;

public record GrupoListDto(
    int    IdGrupo,
    string Nombre,
    int    IdCampeonato,
    int    TotalEquipos
);

public record GrupoDetalleDto(
    int    IdGrupo,
    string Nombre,
    int    IdCampeonato,
    List<EquipoGrupoDto>    Equipos,
    List<PosicionGrupoDto>  Posiciones
);

public record EquipoGrupoDto(
    int    IdEquipo,
    string Nombre,
    string Pais
);

public record PosicionGrupoDto(
    int    Posicion,
    int    IdEquipo,
    string Equipo,
    int    Pj,
    int    Pg,
    int    Pe,
    int    Pp,
    int    Gf,
    int    Gc,
    int    Dg,   // diferencia de goles
    int    Pts,
    bool   Clasificado
);

public record CreateGrupoRequest(
    string Nombre
);

public record UpdateGrupoRequest(
    string Nombre
);

public record AsignarEquipoGrupoRequest(
    int IdEquipo
);

public record GenerarCalendarioRequest(
    int     IdInstancia,
    string  FechaInicio,
    int     DiasEntreJornadas,
    bool    IdaYVuelta
);

public record FaseCampeonatoDto(
    int    IdFase,
    int    IdCampeonato,
    int    IdInstancia,
    string Instancia,
    int    Orden,
    string Formato,
    int    EquiposClasifican
);

public record CreateFaseRequest(
    int    IdInstancia,
    int    Orden,
    string Formato,          // GRUPOS | ELIMINACION_DIRECTA | IDA_Y_VUELTA
    int    EquiposClasifican
);
