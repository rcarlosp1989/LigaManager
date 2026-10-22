namespace LigaManager.Domain.Entities;

// Enlace de un solo uso enviado por correo: confirmar el correo o restablecer la contraseña.
// Solo se guarda el hash SHA-256 del código; el código va únicamente en el correo.
public class TokenUsuario
{
    public int              IdToken   { get; set; }
    public int              IdUsuario { get; set; }
    public TipoTokenUsuario Tipo      { get; set; }
    public string           TokenHash { get; set; } = null!;
    public DateTime         VenceEn   { get; set; }   // UTC
    public DateTime?        UsadoEn   { get; set; }   // UTC
    public DateTime         CreadoEn  { get; set; }   // UTC

    public Usuario Usuario { get; set; } = null!;
}

public enum TipoTokenUsuario
{
    VerificarCorreo,
    RestablecerClave
}
