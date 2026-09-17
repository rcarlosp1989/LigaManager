// ─── CampeonatoEquipo.cs ──────────────────────────────────────────────────────
namespace LigaManager.Domain.Entities;

public class CampeonatoEquipo
{
    public int IdCampeonato { get; set; }
    public int IdEquipo     { get; set; }

    public Campeonato Campeonato { get; set; } = null!;
    public Equipo     Equipo     { get; set; } = null!;
}
