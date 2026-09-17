namespace LigaManager.API.Controllers;
using Microsoft.AspNetCore.Mvc;
using LigaManager.Application.Interfaces;
using LigaManager.Application.DTOs.Auth;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;
    public AuthController(IAuthService auth) => _auth = auth;

    /// <summary>Login y obtención de token JWT</summary>
    [HttpPost("login")]
    [ProducesResponseType(typeof(LoginResponse), 200)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var result = await _auth.LoginAsync(request);
        return result.Success ? Ok(result.Data) : BadRequest(new { error = result.Error });
    }
}