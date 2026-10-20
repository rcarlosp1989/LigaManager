namespace LigaManager.Domain.Entities;

// Dirigente de un equipo con acceso de solo lectura a un campeonato.
// Ve el documento completo solo de los jugadores de su equipo (IdEquipo).
public class CampeonatoDirigente
{
    public int       IdHabilitacion { get; set; }
    public int       IdCampeonato   { get; set; }
    public int       IdUsuario      { get; set; }
    public int       IdEquipo       { get; set; }
    public bool      Activo         { get; set; } = true;
    public int?      CreadoPor      { get; set; }
    public DateTime  CreatedAt      { get; set; }

    public Campeonato Campeonato { get; set; } = null!;
    public Usuario    Usuario    { get; set; } = null!;
    public Equipo     Equipo     { get; set; } = null!;
}
