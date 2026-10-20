// ─── Persona.cs ───────────────────────────────────────────────────────────────
namespace LigaManager.Domain.Entities;

public class Persona
{
    public int      IdPersona  { get; set; }
    public string   Nombre     { get; set; } = null!;
    public string   Apellido   { get; set; } = null!;
    public string   Cedula     { get; set; } = null!;
    // Cedula (ecuatoriana), Extranjero o Pasaporte. Ver Application/Common/Identificacion.
    public TipoIdentificacion TipoIdentificacion { get; set; } = TipoIdentificacion.Cedula;
    public DateOnly FechaNac   { get; set; }
    public int      IdPais     { get; set; }
    public int?     IdCanton   { get; set; }
    public string?  FotoUrl    { get; set; }

    public Pais     Pais     { get; set; } = null!;
    public Canton?  Canton   { get; set; }
    public Jugador? Jugador  { get; set; }
    public Arbitro? Arbitro  { get; set; }
}

// Pendiente: el jugador se registró sin documento; se completa después (solo jugadores).
public enum TipoIdentificacion { Cedula, Extranjero, Pasaporte, Pendiente }
