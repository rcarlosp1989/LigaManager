// ─── TipoPartido.cs ───────────────────────────────────────────────────────────
namespace LigaManager.Domain.Entities;

public class TipoPartido
{
    public int    IdTipoPartido { get; set; }
    public string Nombre        { get; set; } = null!;

    public ICollection<Campeonato> Campeonatos { get; set; } = [];
}