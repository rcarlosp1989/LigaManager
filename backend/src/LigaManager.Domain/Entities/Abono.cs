// ─── Abono.cs ─────────────────────────────────────────────────────────────────
namespace LigaManager.Domain.Entities;

public class Abono
{
    public int      IdAbono   { get; set; }
    public int      IdPago    { get; set; }
    public decimal  Monto     { get; set; }
    public DateOnly Fecha     { get; set; }
    public DateTime CreatedAt { get; set; }
    public MetodoAbono Metodo  { get; set; } = MetodoAbono.EFECTIVO;
    public string?  Referencia { get; set; }
    // Abonos registrados juntos (uno por cobro al repartir un pago): mismo lote, un solo recibo.
    public string?  Lote       { get; set; }

    public Pago Pago { get; set; } = null!;
}

public enum MetodoAbono { EFECTIVO, TRANSFERENCIA, DEPOSITO, OTRO }
