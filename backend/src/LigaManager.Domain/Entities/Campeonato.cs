namespace LigaManager.Domain.Entities;
public class Campeonato
{
    public int              IdCampeonato  { get; set; }
    public string           Nombre        { get; set; } = null!;
    public int              Anio          { get; set; }
    public DateOnly         FechaInicio   { get; set; }
    public DateOnly         FechaFin      { get; set; }
    public EstadoCampeonato Estado        { get; set; } = EstadoCampeonato.Planificado;

    public int              IdModalidad   { get; set; }
    public ModalidadDeportiva            ModalidadDeportiva { get; set; } = null!;

    public int              IdTipoPartido { get; set; }
    public int?              IdUsuarioCreador { get; set; }
    public TipoPartido                   TipoPartido { get; set; } = null!;
    public Usuario?                       UsuarioCreador  { get; set; }
    public ICollection<CampeonatoEquipo> Equipos     { get; set; } = [];
    public ICollection<Jornada>          Jornadas    { get; set; } = [];
    public ICollection<Grupo>            Grupos      { get; set; } = [];
}
public enum EstadoCampeonato { Planificado, EnCurso, Finalizado }
