namespace LigaManager.Domain.Entities;
public class AlineacionJugador
{
    public int     IdAlineacion { get; set; }
    public int     IdPartido    { get; set; }
    public int     IdEquipo     { get; set; }
    public int     IdJugador    { get; set; }
    public bool    Titular      { get; set; }
    public DateTime CreatedAt   { get; set; }
    public int?     IdUsuarioRegistro { get; set; }   // Fase 8: quién lo convocó
    public Usuario? UsuarioRegistro   { get; set; }
    public Partido Partido      { get; set; } = null!;
    public Equipo  Equipo       { get; set; } = null!;
    public Jugador Jugador      { get; set; } = null!;
}
