namespace LigaManager.Infrastructure.Services;
using LigaManager.Application.DTOs.Auth;
using LigaManager.Application.Common;
using LigaManager.Application.Interfaces;
using LigaManager.Domain.Entities;
using LigaManager.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

public class AuthService : IAuthService
{
    private readonly LigaManagerContext _db;
    private readonly IConfiguration     _config;

    public AuthService(LigaManagerContext db, IConfiguration config)
    {
        _db     = db;
        _config = config;
    }

    public async Task<ServiceResult<LoginResponse>> LoginAsync(LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Password))
            return ServiceResult<LoginResponse>.Fail("Email y contraseña son requeridos.");

        var usuario = await _db.Usuarios
            .FirstOrDefaultAsync(u => u.Email == request.Email.ToLower().Trim()
                                   && u.Activo);

        if (usuario is null || !BCrypt.Net.BCrypt.Verify(request.Password, usuario.PasswordHash))
            return ServiceResult<LoginResponse>.Fail("Credenciales incorrectas.");

        return ServiceResult<LoginResponse>.Ok(GenerarRespuesta(usuario));
    }

    public async Task<ServiceResult<LoginResponse>> RegisterAsync(RegisterRequest request)
    {
        var nombre   = request.Nombre?.Trim() ?? "";
        var email    = request.Email?.ToLower().Trim() ?? "";
        var password = request.Password ?? "";

        if (nombre.Length == 0 || email.Length == 0 || password.Length == 0)
            return ServiceResult<LoginResponse>.Fail("Nombre, email y contraseña son requeridos.");
        if (nombre.Length > 100 || email.Length > 150)
            return ServiceResult<LoginResponse>.Fail("Nombre o email demasiado largos.");
        if (!System.Text.RegularExpressions.Regex.IsMatch(email, @"^[^@\s]+@[^@\s]+\.[^@\s]+$"))
            return ServiceResult<LoginResponse>.Fail("El email no es válido.");
        if (password.Length < 6)
            return ServiceResult<LoginResponse>.Fail("La contraseña debe tener al menos 6 caracteres.");

        if (await _db.Usuarios.AnyAsync(u => u.Email == email))
            return ServiceResult<LoginResponse>.Fail("Ya existe una cuenta con ese email.");

        var usuario = new Usuario
        {
            Nombre       = nombre,
            Email        = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            Rol          = RolUsuario.Organizador,
            Activo       = true,
            CreatedAt    = DateTime.UtcNow,
        };

        try
        {
            _db.Usuarios.Add(usuario);
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return ServiceResult<LoginResponse>.Fail("Ya existe una cuenta con ese email.");
        }

        return ServiceResult<LoginResponse>.Ok(GenerarRespuesta(usuario));
    }

    private LoginResponse GenerarRespuesta(Usuario usuario)
    {
        var jwt    = _config.GetSection("JwtSettings");
        var key    = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt["SecretKey"]!));
        var expira = DateTime.UtcNow.AddHours(int.Parse(jwt["ExpirationHours"]!));

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, usuario.IdUsuario.ToString()),
            new Claim(ClaimTypes.Email,          usuario.Email),
            new Claim(ClaimTypes.Name,           usuario.Nombre),
            new Claim(ClaimTypes.Role,           usuario.Rol.ToString())
        };

        var token = new JwtSecurityToken(
            issuer:             jwt["Issuer"],
            audience:           jwt["Audience"],
            claims:             claims,
            expires:            expira,
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256)
        );

        return new LoginResponse(
            new JwtSecurityTokenHandler().WriteToken(token),
            usuario.Nombre,
            usuario.Rol.ToString(),
            expira
        );
    }
}