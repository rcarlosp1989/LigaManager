namespace LigaManager.Domain.Entities;
public class JugadorEquipo
{
    public int      IdJugadorEquipo { get; set; }
    public int      IdJugador       { get; set; }
    public int      IdEquipo        { get; set; }
    public int?     Dorsal          { get; set; }
    public string?  Posicion       { get; set; }
    public DateOnly FechaDesde      { get; set; }
    public DateOnly? FechaHasta     { get; set; }
    public Jugador  Jugador         { get; set; } = null!;
    public Equipo   Equipo          { get; set; } = null!;
}
