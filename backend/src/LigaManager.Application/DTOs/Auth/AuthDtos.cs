// AuthDtos.cs
namespace LigaManager.Application.DTOs.Auth;

public record LoginRequest(string Email, string Password);

public record RegisterRequest(string Nombre, string Email, string Password);

public record LoginResponse(
    string Token,
    string Nombre,
    string Rol,
    DateTime Expira
);
