namespace LigaManager.Domain.Entities;

public class CatalogoInstancia
{
    public int    IdInstancia { get; set; }
    public string Nombre      { get; set; } = null!;
    public int    Orden       { get; set; }   // columna obligatoria en la base

    public ICollection<Jornada> Jornadas { get; set; } = [];
}