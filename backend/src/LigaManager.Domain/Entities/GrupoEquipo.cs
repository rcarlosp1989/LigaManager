namespace LigaManager.Domain.Entities;

public class GrupoEquipo
{
    public int    IdGrupo  { get; set; }
    public int    IdEquipo { get; set; }
    public Grupo  Grupo    { get; set; } = null!;
    public Equipo Equipo   { get; set; } = null!;
}
