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
}

public enum RolUsuario
{
    Admin,
    Arbitro,
    Veedor,
    Delegado
}