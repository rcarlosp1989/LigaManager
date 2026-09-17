namespace LigaManager.Domain.Entities;

public class Grupo
{
    public int    IdGrupo      { get; set; }
    public string Nombre       { get; set; } = null!;
    public int    IdCampeonato { get; set; }

    public Campeonato              Campeonato { get; set; } = null!;
    public ICollection<Jornada>    Jornadas   { get; set; } = [];
    public ICollection<GrupoEquipo> Equipos   { get; set; } = [];
    public ICollection<PosicionGrupo> Posiciones { get; set; } = [];
}
