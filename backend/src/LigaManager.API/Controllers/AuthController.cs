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
        if (result.Success) return Ok(result.Data);
        // Organizador sin confirmar el correo: 403 con un código para que la pantalla ofrezca reenviarlo.
        if (result.Error == Infrastructure.Services.AuthService.ErrorCorreoSinConfirmar)
            return StatusCode(403, new { error = "Confirme su correo para ingresar. Revise su bandeja de entrada y también las carpetas de correo no deseado (Spam) y Promociones.", codigo = result.Error });
        return BadRequest(new { error = result.Error });
    }

    /// <summary>Registro de un nuevo usuario con rol Organizador</summary>
    [AllowAnonymous]
    [LimitarIntentos("registro")]
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var r = await _auth.RegisterAsync(request);
        if (!r.Success) return BadRequest(new { error = r.Error });
        // Sin confirmación: la sesión, como antes. Con confirmación: aviso para revisar el correo.
        return r.Data!.Sesion is { } sesion ? Ok(sesion) : Ok(new { confirmarCorreo = true, email = r.Data.Email });
    }

    /// <summary>Qué ofrece la pantalla de inicio de sesión (por ejemplo, restablecer la contraseña)</summary>
    [AllowAnonymous]
    [HttpGet("opciones")]
    public IActionResult Opciones() => Ok(_auth.Opciones());

    private const string Generico = "Si el correo se encuentra registrado, recibirá un mensaje en los próximos minutos. Le recomendamos revisar también las carpetas de correo no deseado (Spam) y Promociones.";

    [AllowAnonymous]
    [LimitarIntentos("correo")]
    [HttpPost("reenviar-confirmacion")]
    public async Task<IActionResult> ReenviarConfirmacion([FromBody] CorreoRequest req)
    {
        await _auth.ReenviarConfirmacionAsync(req.Email);
        return Ok(new { mensaje = Generico });
    }

    [AllowAnonymous]
    [LimitarIntentos("enlace")]
    [HttpPost("confirmar-correo")]
    public async Task<IActionResult> ConfirmarCorreo([FromBody] ConfirmarCorreoRequest req)
    {
        var r = await _auth.ConfirmarCorreoAsync(req.Token);
        return r.Success ? Ok(r.Data) : BadRequest(new { error = r.Error });
    }

    [AllowAnonymous]
    [LimitarIntentos("correo")]
    [HttpPost("olvide-clave")]
    public async Task<IActionResult> OlvideClave([FromBody] CorreoRequest req)
    {
        await _auth.OlvideClaveAsync(req.Email);
        return Ok(new { mensaje = Generico });
    }

    [AllowAnonymous]
    [LimitarIntentos("enlace")]
    [HttpGet("restablecer/{token}")]
    public async Task<IActionResult> ValidarRestablecer(string token)
    {
        var r = await _auth.ValidarRestablecerAsync(token);
        return r.Valido ? Ok(r) : NotFound(r);
    }

    [AllowAnonymous]
    [LimitarIntentos("enlace")]
    [HttpPost("restablecer")]
    public async Task<IActionResult> Restablecer([FromBody] RestablecerRequest req)
    {
        var r = await _auth.RestablecerAsync(req);
        return r.Success ? Ok(r.Data) : BadRequest(new { error = r.Error });
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