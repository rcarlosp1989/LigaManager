// ─── Pais.cs ──────────────────────────────────────────────────────────────────
namespace LigaManager.Domain.Entities;

public class Pais
{
    public int     IdPais  { get; set; }
    public string  Nombre  { get; set; } = null!;

    public ICollection<Provincia> Provincias { get; set; } = [];
    public ICollection<Equipo>    Equipos    { get; set; } = [];
}
