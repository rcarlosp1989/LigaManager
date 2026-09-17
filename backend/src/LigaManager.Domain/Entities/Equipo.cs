// ─── Equipo.cs ────────────────────────────────────────────────────────────────
namespace LigaManager.Domain.Entities;

public class Equipo
{
    public int    IdEquipo { get; set; }
    public string Nombre   { get; set; } = null!;
    public int    IdPais   { get; set; }
    public int?   IdUsuarioCreador { get; set; }

    public Pais                          Pais              { get; set; } = null!;
    public Usuario?                      UsuarioCreador    { get; set; }
    public ICollection<JugadorEquipo>    JugadorEquipos    { get; set; } = [];
    public ICollection<CampeonatoEquipo> CampeonatoEquipos { get; set; } = [];
}