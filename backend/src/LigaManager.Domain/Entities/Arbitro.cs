namespace LigaManager.Domain.Entities;

public class Arbitro
{
    public int IdArbitro { get; set; }
    public int IdPersona { get; set; }
    public int? IdUsuarioCreador { get; set; }

    public Persona              Persona  { get; set; } = null!;
    public Usuario?             UsuarioCreador { get; set; }
    public ICollection<Partido> Partidos { get; set; } = [];
    public ICollection<PartidoOficial> Designaciones { get; set; } = [];
}