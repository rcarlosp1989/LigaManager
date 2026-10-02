namespace LigaManager.Domain.Entities;

// Sanción agregada a mano por la comisión disciplinaria en Estadísticas > Suspensiones,
// sin estar ligada a una tarjeta registrada en un partido.
public class SancionManual
{
    public int      IdSancion       { get; set; }
    public int      IdCampeonato    { get; set; }
    public int      IdJugador       { get; set; }
    public string   Motivo          { get; set; } = null!;
    public int      PartidosSancion { get; set; } = 1;
    public DateOnly FechaDecision   { get; set; }
    public DateTime CreatedAt       { get; set; }

    public Campeonato Campeonato { get; set; } = null!;
    public Jugador    Jugador    { get; set; } = null!;
}
