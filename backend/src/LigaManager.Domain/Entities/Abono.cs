// ─── Abono.cs ─────────────────────────────────────────────────────────────────
namespace LigaManager.Domain.Entities;

public class Abono
{
    public int      IdAbono   { get; set; }
    public int      IdPago    { get; set; }
    public decimal  Monto     { get; set; }
    public DateOnly Fecha     { get; set; }
    public DateTime CreatedAt { get; set; }

    public Pago Pago { get; set; } = null!;
}
