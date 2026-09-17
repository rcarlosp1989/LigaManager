namespace LigaManager.Domain.Entities;

public class ModalidadDeportiva
{
    public int    IdModalidad        { get; set; }
    public string Nombre             { get; set; } = null!;
    public int    JugadoresPorLado   { get; set; }
    public int    DuracionTiempoMin  { get; set; }
    public int    NumTiempos         { get; set; }
    public bool   PermiteProrroga    { get; set; }
    public bool   PermitePenales     { get; set; }
    public string? Descripcion       { get; set; }

    public ICollection<Campeonato> Campeonatos { get; set; } = [];
    public ICollection<ModalidadCargo> Cargos { get; set; } = [];
}
