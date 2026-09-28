namespace LigaManager.Domain.Entities;

public class Canton
{
    public int    IdCanton     { get; set; }
    public string Nombre       { get; set; } = null!;
    public int    IdProvincia  { get; set; }

    public Provincia Provincia { get; set; } = null!;
}
