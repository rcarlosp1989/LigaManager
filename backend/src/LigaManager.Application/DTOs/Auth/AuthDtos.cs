// AuthDtos.cs
namespace LigaManager.Application.DTOs.Auth;

// Recordarme: la sesión dura 7 días; si no, 12 horas (y el navegador la olvida al cerrarse).
public record LoginRequest(string Email, string Password, bool Recordarme = false);

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

// Registro: con servicio de correo, la cuenta queda pendiente de confirmar (Sesion null);
// sin servicio de correo, entra directo (Sesion con el token).
public record RegistroResultado(LoginResponse? Sesion, bool ConfirmarCorreo, string Email);

// Qué ofrece la pantalla de inicio de sesión.
public record OpcionesAuthDto(bool Correo);

public record CorreoRequest(string Email);
public record ConfirmarCorreoRequest(string Token);
public record RestablecerRequest(string Token, string Password);
public record EnlaceValidoDto(bool Valido, string? Motivo);
