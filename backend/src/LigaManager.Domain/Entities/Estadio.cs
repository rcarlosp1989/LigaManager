namespace LigaManager.Domain.Entities;

public class Estadio
{
    public int    IdEstadio { get; set; }
    public string Nombre    { get; set; } = null!;
    public int    IdPais    { get; set; }
    public int?   IdCanton  { get; set; }
    public int?   IdUsuarioCreador { get; set; }

    public Pais                 Pais     { get; set; } = null!;
    public Canton?              Canton   { get; set; }
    public Usuario?             UsuarioCreador { get; set; }
    public ICollection<Partido> Partidos { get; set; } = [];
}
