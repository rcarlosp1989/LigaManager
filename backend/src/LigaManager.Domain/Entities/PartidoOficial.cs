namespace LigaManager.Domain.Entities;

public class PartidoOficial
{
    public int IdPartido { get; set; }
    public int IdCargo { get; set; }
    public int IdArbitro { get; set; }
    public Partido Partido { get; set; } = null!;
    public CargoOficial Cargo { get; set; } = null!;
    public Arbitro Arbitro { get; set; } = null!;
}
