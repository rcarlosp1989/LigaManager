// ─── Jornada.cs ───────────────────────────────────────────────────────────────
namespace LigaManager.Domain.Entities;

public class Jornada
{
    public int  IdJornada    { get; set; }
    public int  Numero       { get; set; }
    public int  IdCampeonato { get; set; }
    public int  IdInstancia  { get; set; }
    public int? IdGrupo      { get; set; }

    public Campeonato         Campeonato { get; set; } = null!;
    public CatalogoInstancia  Instancia  { get; set; } = null!;
    public Grupo?             Grupo      { get; set; }
    public ICollection<Partido> Partidos { get; set; } = [];
}