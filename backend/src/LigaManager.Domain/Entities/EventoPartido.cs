namespace LigaManager.Domain.Entities;
public class EventoPartido
{
    public int    IdEvento   { get; set; }
    public int    IdPartido  { get; set; }
    public int    IdJugador  { get; set; }
    public string TipoEvento { get; set; } = null!;
    public int    Minuto     { get; set; }
    public DateTime CreatedAt { get; set; }
    public int?     IdUsuarioRegistro { get; set; }   // Fase 8: quién lo registró
    public string?  IdCliente         { get; set; }   // Fase 8: id del celular, evita duplicados
    public Usuario? UsuarioRegistro   { get; set; }
    public Partido Partido   { get; set; } = null!;
    public Jugador Jugador   { get; set; } = null!;
}
