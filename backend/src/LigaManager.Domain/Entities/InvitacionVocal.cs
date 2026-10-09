namespace LigaManager.Domain.Entities;

// Invitación de un solo uso para habilitar a un vocal en un campeonato.
// Solo se guarda el hash SHA-256 del código; el código se muestra una vez al crearla.
public class InvitacionVocal
{
    public int        IdInvitacion { get; set; }
    public int        IdCampeonato { get; set; }
    public TipoVocal  Tipo         { get; set; } = TipoVocal.Titular;
    public DateOnly?  SoloFecha    { get; set; }
    public string     TokenHash    { get; set; } = null!;
    public int        CreadaPor    { get; set; }
    public DateTime   CreatedAt    { get; set; }
    public DateTime   VenceEn      { get; set; }
    public int?       UsadaPor     { get; set; }
    public DateTime?  UsadaEn      { get; set; }
    public bool       Revocada     { get; set; }

    public Campeonato Campeonato     { get; set; } = null!;
    public Usuario    Creador        { get; set; } = null!;
    public Usuario?   UsuarioQueUso  { get; set; }
}
