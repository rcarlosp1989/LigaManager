// ─── ConceptoPago.cs ──────────────────────────────────────────────────────────
namespace LigaManager.Domain.Entities;

public class ConceptoPago
{
    public int    IdConcepto  { get; set; }
    public string Descripcion { get; set; } = null!;

    public ICollection<Pago> Pagos { get; set; } = [];
}