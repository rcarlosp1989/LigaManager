// ─── Ciudad.cs ────────────────────────────────────────────────────────────────
namespace LigaManager.Domain.Entities;
public class Ciudad
{
    public int    IdCiudad { get; set; }
    public string Nombre   { get; set; } = null!;
    public int    IdPais   { get; set; }
    public Pais                Pais     { get; set; } = null!;
    public ICollection<Persona>  Personas { get; set; } = [];
    public ICollection<Estadio>  Estadios { get; set; } = [];
}