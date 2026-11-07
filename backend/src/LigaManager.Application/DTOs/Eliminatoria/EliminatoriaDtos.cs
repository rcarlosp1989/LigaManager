namespace LigaManager.Application.DTOs.Eliminatoria;

// ── Fase eliminatoria (llaves) ───────────────────────────────────────────────

// Reglas de una ronda. Tipo: OCTAVOS | CUARTOS | SEMIFINAL | TERCER_PUESTO | FINAL.
// Desempate: PENALES | PRORROGA_PENALES | MEJOR_UBICADO. Gol de visitante: solo ida y vuelta.
public record ConfigRondaRequest(string Tipo, bool IdaYVuelta, string Desempate, bool GolVisitante);

// ReglaTarjetas: BORRAR_SALVO_EXPULSION_FINAL | MANTENER | BORRAR_TODO.
public record GuardarEliminatoriaRequest(
    int                      EquiposClasifican,
    bool                     TercerPuesto,
    string                   ReglaTarjetas,
    List<ConfigRondaRequest> Rondas
);

// Un cruce: A es local en la ida (o en el partido único).
public record LlaveRequest(int IdEquipoA, int IdEquipoB);

// Fechas 'yyyy-MM-dd HH:mm' de la ida (o del partido único) y de la vuelta.
public record CrearRondaRequest(List<LlaveRequest> Llaves, string FechaIda, string? FechaVuelta = null);

public record PenalesRequest(int? PenalesA, int? PenalesB);

// Lo que el modo en vivo necesita para saber, con el marcador actual, si la llave queda empatada
// al cerrar este partido. «Previos»: goles de cada equipo de ESTE partido en los otros partidos
// jugados de la llave; «VisitaPrevios»: los que hizo jugando de visitante en ellos.
public record LlaveCierreDto(
    string  Ronda,
    string  Pierna,           // IDA | VUELTA | UNICO
    bool    EsUltimo,         // al cerrar este partido termina la llave
    bool    GolVisitante,
    string  Desempate,        // PENALES | PRORROGA_PENALES | MEJOR_UBICADO
    int     PreviosLocal,
    int     PreviosVisitante,
    int     VisitaPreviosLocal,
    int     VisitaPreviosVisitante
);

public record EquipoLlaveDto(int IdEquipo, string Nombre, string? LogoUrl);

// Pierna: IDA | VUELTA | UNICO. Goles y penales vistos desde A y B (no local/visitante).
public record PartidoLlaveDto(
    int     IdPartido,
    int     IdJornada,
    int     NumeroJornada,
    string  Pierna,
    string  Fecha,
    bool    Jugado,
    int?    GolesA,
    int?    GolesB,
    int?    PenalesA,
    int?    PenalesB
);

// Estado: PENDIENTE (faltan partidos) | DEFINIDA | FALTAN_PENALES (empatada, sin penales).
public record LlaveDto(
    int                   IdLlave,
    int                   Orden,
    EquipoLlaveDto        EquipoA,
    EquipoLlaveDto        EquipoB,
    List<PartidoLlaveDto> Partidos,
    int?                  GlobalA,
    int?                  GlobalB,
    int?                  IdGanador,
    string                Estado,
    string?               Detalle
);

public record RondaDto(
    string               Tipo,
    string               Nombre,
    bool                 IdaYVuelta,
    string               Desempate,
    bool                 GolVisitante,
    int                  TotalLlaves,     // llaves que tendrá la ronda
    bool                 Creada,          // ya tiene llaves
    bool                 Completa,        // todas sus llaves tienen ganador
    bool                 PuedeCrearse,    // es la siguiente y la anterior está completa
    bool                 PuedeEliminarse, // es la última creada y ningún partido empezó
    List<LlaveDto>       Llaves,
    List<EquipoLlaveDto> Candidatos       // equipos para armarla (vacío en la primera ronda)
);

public record EliminatoriaDto(
    bool            Configurada,
    string          Modo,
    int             EquiposClasifican,
    bool            TercerPuesto,
    string          ReglaTarjetas,
    List<RondaDto>  Rondas,
    EquipoLlaveDto? Campeon
);
