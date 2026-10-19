namespace LigaManager.Domain.Entities;

// Invitación de un solo uso para habilitar a un dirigente de un equipo en un campeonato.
// Solo se guarda el hash SHA-256 del código; el código se muestra una vez al crearla.
public class InvitacionDirigente
{
    public int        IdInvitacion { get; set; }
    public int        IdCampeonato { get; set; }
    public int        IdEquipo     { get; set; }
    public string     TokenHash    { get; set; } = null!;
    public int        CreadaPor    { get; set; }
    public DateTime   CreatedAt    { get; set; }
    public DateTime   VenceEn      { get; set; }
    public int?       UsadaPor     { get; set; }
    public DateTime?  UsadaEn      { get; set; }
    public bool       Revocada     { get; set; }

    public Campeonato Campeonato    { get; set; } = null!;
    public Equipo     Equipo        { get; set; } = null!;
    public Usuario    Creador       { get; set; } = null!;
    public Usuario?   UsuarioQueUso { get; set; }
}
