namespace LigaManager.Domain.Entities;

public class Provincia
{
    public int    IdProvincia { get; set; }
    public string Nombre      { get; set; } = null!;
    public int    IdPais      { get; set; }

    public Pais                Pais     { get; set; } = null!;
    public ICollection<Canton> Cantones { get; set; } = [];
}
