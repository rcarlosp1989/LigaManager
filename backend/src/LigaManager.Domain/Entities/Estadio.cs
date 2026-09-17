namespace LigaManager.Domain.Entities;

public class Estadio
{
    public int    IdEstadio { get; set; }
    public string Nombre    { get; set; } = null!;
    public int    IdCiudad  { get; set; }
    public int?   IdUsuarioCreador { get; set; }

    public Ciudad               Ciudad   { get; set; } = null!;
    public Usuario?             UsuarioCreador { get; set; }
    public ICollection<Partido> Partidos { get; set; } = [];
}