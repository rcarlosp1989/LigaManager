namespace LigaManager.Domain.Entities;

public class PosicionGrupo
{
    public int    IdPosicion { get; set; }
    public int    IdGrupo    { get; set; }
    public int    IdEquipo   { get; set; }
    public int    Pj         { get; set; }
    public int    Pg         { get; set; }
    public int    Pe         { get; set; }
    public int    Pp         { get; set; }
    public int    Gf         { get; set; }
    public int    Gc         { get; set; }
    public int    Pts        { get; set; }

    public Grupo  Grupo  { get; set; } = null!;
    public Equipo Equipo { get; set; } = null!;
}
