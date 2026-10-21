// AuthDtos.cs
namespace LigaManager.Application.DTOs.Auth;

public record LoginRequest(string Email, string Password);

public record RegisterRequest(string Nombre, string Email, string Password, bool AceptaTerminos = false);

// Estado de los términos de uso del usuario actual.
public record TerminosDto(string Version, DateTime? AceptadosEn, bool Pendiente);

public record AceptarTerminosRequest(string Version);

public record LoginResponse(
    string Token,
    string Nombre,
    string Rol,
    DateTime Expira
);
