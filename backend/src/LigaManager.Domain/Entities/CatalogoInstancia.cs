namespace LigaManager.Domain.Entities;

public class CatalogoInstancia
{
    public int    IdInstancia { get; set; }
    public string Nombre      { get; set; } = null!;

    public ICollection<Jornada> Jornadas { get; set; } = [];
}