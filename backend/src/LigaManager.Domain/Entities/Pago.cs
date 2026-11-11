// ─── Pago.cs ──────────────────────────────────────────────────────────────────
namespace LigaManager.Domain.Entities; 

public class Pago
{
    public int      IdPago        { get; set; }
    public int      IdCampeonato  { get; set; }
    public int?     IdEquipo      { get; set; }
    public int?     IdJugador     { get; set; }
    public int      IdConcepto    { get; set; }
    public decimal  Monto         { get; set; }
    public DateOnly Fecha         { get; set; }
    public DateTime CreatedAt     { get; set; }
    // Detalle que se muestra (ej. «Jornada 2 · Pedro Alvia, min 34»).
    public string?  Descripcion   { get; set; }
    public int?     IdPartido     { get; set; }
    // Cobros que genera el sistema (inscripción, refuerzo, arbitraje, tarjetas): identifican su
    // origen para no repetirlos. Null = cobro manual (multa, apelación, otro).
    public string?  ClaveAuto     { get; set; }

    public Campeonato   Campeonato  { get; set; } = null!;
    public Equipo?      Equipo      { get; set; }
    public Jugador?     Jugador     { get; set; }
    public ConceptoPago Concepto    { get; set; } = null!;
    public ICollection<Abono> Abonos { get; set; } = [];
}