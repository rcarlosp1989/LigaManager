// ─── ConceptoPago.cs ──────────────────────────────────────────────────────────
namespace LigaManager.Domain.Entities;

public class ConceptoPago
{
    public int    IdConcepto  { get; set; }
    public string Descripcion { get; set; } = null!;
    // INSCRIPCION | REFUERZO | ARBITRAJE | AMARILLA | ROJA | MULTA | APELACION | OTRO
    public string? Codigo     { get; set; }

    public ICollection<Pago> Pagos { get; set; } = [];
}