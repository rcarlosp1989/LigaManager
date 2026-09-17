namespace LigaManager.Domain.Entities;

public class CargoOficial
{
    public int IdCargo { get; set; }
    public string Codigo { get; set; } = null!;
    public string Nombre { get; set; } = null!;
    public ICollection<ModalidadCargo> Modalidades { get; set; } = [];
    public ICollection<PartidoOficial> Partidos { get; set; } = [];
}
