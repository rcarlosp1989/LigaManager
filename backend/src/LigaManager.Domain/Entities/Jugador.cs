namespace LigaManager.Domain.Entities;

public class Jugador
{
    public int IdJugador { get; set; }
    public int IdPersona { get; set; }

    public Persona                    Persona        { get; set; } = null!;
    public ICollection<JugadorEquipo> JugadorEquipos { get; set; } = [];
    public ICollection<EventoPartido> Eventos        { get; set; } = [];
}