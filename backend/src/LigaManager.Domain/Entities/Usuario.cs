// backend/src/LigaManager.Domain/Entities/Usuario.cs
namespace LigaManager.Domain.Entities;

public class Usuario
{
    public int         IdUsuario    { get; set; }
    public string      Email        { get; set; } = null!;
    public string      PasswordHash { get; set; } = null!;
    public string      Nombre       { get; set; } = null!;
    public RolUsuario  Rol          { get; set; } = RolUsuario.Admin;
    public bool        Activo       { get; set; } = true;
    public DateTime    CreatedAt    { get; set; }
    // Términos de uso aceptados (organizadores): cuándo y qué versión.
    public DateTime?   TerminosAceptadosEn { get; set; }   // UTC
    public string?     TerminosVersion     { get; set; }
    // Correo confirmado. Solo los organizadores nuevos empiezan sin confirmar (si hay servicio de correo).
    public bool        EmailVerificado     { get; set; } = true;
    // Último cambio de contraseña (UTC): las sesiones emitidas antes dejan de valer.
    public DateTime?   ClaveCambiadaEn     { get; set; }
}

public enum RolUsuario
{
    Admin,
    Arbitro,
    Veedor,
    Delegado,
    Organizador,
    Vocal,
    Dirigente
}