namespace LigaManager.Domain.Entities;

public class ModalidadCargo
{
    public int IdModalidad { get; set; }
    public int IdCargo { get; set; }
    public bool Obligatorio { get; set; }
    public ModalidadDeportiva Modalidad { get; set; } = null!;
    public CargoOficial Cargo { get; set; } = null!;
}
