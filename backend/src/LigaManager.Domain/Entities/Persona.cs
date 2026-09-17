// ─── Persona.cs ───────────────────────────────────────────────────────────────
namespace LigaManager.Domain.Entities;

public class Persona
{
    public int      IdPersona  { get; set; }
    public string   Nombre     { get; set; } = null!;
    public string   Apellido   { get; set; } = null!;
    public string   Cedula     { get; set; } = null!;
    public DateOnly FechaNac   { get; set; }
    public int      IdCiudad   { get; set; }
    public string?  FotoUrl    { get; set; }

    public Ciudad  Ciudad   { get; set; } = null!;
    public Jugador? Jugador  { get; set; }
    public Arbitro? Arbitro  { get; set; }
}