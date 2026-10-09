namespace LigaManager.Domain.Entities;
public class Partido
{
    public int      IdPartido         { get; set; }
    public int      IdJornada         { get; set; }
    public int      IdEquipoLocal     { get; set; }
    public int      IdEquipoVisitante { get; set; }
    public DateTime Fecha             { get; set; }
    public int?     IdEstadio         { get; set; }
    public int?     IdArbitro         { get; set; }
    public int?     IdGrupo           { get; set; }
    public bool     Jugado            { get; set; } = false;
    public bool     Desierto          { get; set; } = false;
    public string?  Observaciones     { get; set; }
    public bool     PerdidaReglamento { get; set; } = false;
    public int?     IdEquipoSancionado { get; set; }
    public int?     GolesLocal        { get; set; }
    public int?     GolesVisitante    { get; set; }
    public DateTime CreatedAt         { get; set; }
    public DateTime UpdatedAt         { get; set; }

    // Fase 8: registro desde el modo en vivo.
    public EstadoRegistro EstadoRegistro  { get; set; } = EstadoRegistro.SinIniciar;
    public DateTime?      IniciadoEn      { get; set; }   // UTC
    public DateTime?      CerradoEn       { get; set; }   // UTC
    public int?           IdUsuarioCierre { get; set; }
    public Usuario?       UsuarioCierre   { get; set; }
    public Jornada  Jornada           { get; set; } = null!;
    public Equipo   EquipoLocal       { get; set; } = null!;
    public Equipo   EquipoVisitante   { get; set; } = null!;
    public Estadio? Estadio           { get; set; }
    public Arbitro? Arbitro           { get; set; }
    public Grupo?   Grupo             { get; set; }
    public ICollection<EventoPartido> Eventos { get; set; } = [];
    public ICollection<AlineacionJugador> Alineaciones { get; set; } = [];
    public ICollection<CambioPartido> Cambios { get; set; } = [];
    public ICollection<PartidoOficial> Oficiales { get; set; } = [];
}

public enum EstadoRegistro
{
    SinIniciar,
    EnVivo,
    Cerrado
}
