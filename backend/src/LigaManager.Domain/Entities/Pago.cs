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

    public Campeonato   Campeonato  { get; set; } = null!;
    public Equipo?      Equipo      { get; set; }
    public Jugador?     Jugador     { get; set; }
    public ConceptoPago Concepto    { get; set; } = null!;
    public ICollection<Abono> Abonos { get; set; } = [];
}