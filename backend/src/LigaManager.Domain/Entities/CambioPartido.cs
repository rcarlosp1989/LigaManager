namespace LigaManager.Domain.Entities;
public class CambioPartido
{
    public int      IdCambio       { get; set; }
    public int      IdPartido      { get; set; }
    public int      IdEquipo       { get; set; }
    public int      IdJugadorSale  { get; set; }
    public int      IdJugadorEntra { get; set; }
    public int      Minuto         { get; set; }
    public DateTime CreatedAt      { get; set; }
    public int?     IdUsuarioRegistro { get; set; }   // Fase 8
    public string?  IdCliente         { get; set; }   // Fase 8
    public Usuario? UsuarioRegistro   { get; set; }

    public Partido  Partido        { get; set; } = null!;
    public Equipo   Equipo         { get; set; } = null!;
    public Jugador  JugadorSale    { get; set; } = null!;
    public Jugador  JugadorEntra   { get; set; } = null!;
}
