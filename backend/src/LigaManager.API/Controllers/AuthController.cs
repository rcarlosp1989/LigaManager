namespace LigaManager.API.Controllers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using LigaManager.Application.Interfaces;
using LigaManager.Application.DTOs.Auth;
using LigaManager.API.Seguridad;
using System.Security.Claims;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;
    public AuthController(IAuthService auth) => _auth = auth;

    /// <summary>Login y obtención de token JWT</summary>
    [LimitarIntentos("login")]
    [HttpPost("login")]
    [ProducesResponseType(typeof(LoginResponse), 200)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var result = await _auth.LoginAsync(request);
        return result.Success ? Ok(result.Data) : BadRequest(new { error = result.Error });
    }

    /// <summary>Registro de un nuevo usuario con rol Organizador</summary>
    [AllowAnonymous]
    [HttpPost("register")]
    [ProducesResponseType(typeof(LoginResponse), 200)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var result = await _auth.RegisterAsync(request);
        return result.Success ? Ok(result.Data) : BadRequest(new { error = result.Error });
    }

    private int? UsuarioId => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    /// <summary>Estado de los términos de uso del organizador actual</summary>
    [Authorize]
    [HttpGet("terminos")]
    public async Task<IActionResult> Terminos()
        => UsuarioId is int u && await _auth.TerminosAsync(u) is { } t ? Ok(t) : Unauthorized();

    /// <summary>Aceptar la versión vigente de los términos de uso</summary>
    [Authorize]
    [HttpPost("terminos")]
    public async Task<IActionResult> AceptarTerminos([FromBody] AceptarTerminosRequest req)
    {
        if (UsuarioId is not int u) return Unauthorized();
        var r = await _auth.AceptarTerminosAsync(u, req);
        return r.Success ? Ok(r.Data) : BadRequest(new { error = r.Error });
    }
}