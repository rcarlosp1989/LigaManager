namespace LigaManager.API.Controllers;
using System.Security.Claims;
using LigaManager.API.Monitoreo;
using LigaManager.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;

// Monitoreo: chequeo de salud (para Railway y UptimeRobot) y errores que manda la pantalla.
[ApiController]
[Route("api")]
public class MonitoreoController : ControllerBase
{
    // GET /api/salud → 200 si el servidor responde y la base de datos contesta; si no, 503.
    [HttpGet("salud")]
    [AllowAnonymous]
    public async Task<IActionResult> Salud([FromServices] LigaManagerContext db, CancellationToken ct)
    {
        bool baseOk;
        try
        {
            using var limite = CancellationTokenSource.CreateLinkedTokenSource(ct);
            limite.CancelAfter(TimeSpan.FromSeconds(5));
            baseOk = await db.Database.CanConnectAsync(limite.Token);
        }
        catch { baseOk = false; }
        Response.Headers.CacheControl = "no-store";
        var cuerpo = new { estado = baseOk ? "ok" : "sin base de datos", baseDeDatos = baseOk, hora = DateTime.UtcNow };
        return baseOk ? Ok(cuerpo) : StatusCode(503, cuerpo);
    }

    public sealed record ErrorPantallaDto(string? Mensaje, string? Pila, string? Ruta, string? Navegador, string? Version);

    // POST /api/errores-pantalla — el navegador avisa un error de la pantalla. Sin sesión obligatoria
    // (también fallan las páginas públicas). Máximo 20 avisos por IP cada 10 minutos.
    [HttpPost("errores-pantalla")]
    [AllowAnonymous]
    [RequestSizeLimit(16 * 1024)]
    public IActionResult ErrorPantalla([FromBody] ErrorPantallaDto dto, [FromServices] AvisoErrores avisos,
                                       [FromServices] IMemoryCache cache)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "?";
        var clave = "errores-pantalla:" + ip;
        var n = cache.GetOrCreate(clave, e => { e.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10); return new int[1]; })!;
        if (Interlocked.Increment(ref n[0]) > 20) return StatusCode(429);
        if (string.IsNullOrWhiteSpace(dto.Mensaje)) return BadRequest();

        var usuario = User.Identity?.IsAuthenticated == true
            ? $"{User.FindFirstValue(ClaimTypes.Role) ?? "usuario"} #{User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "?"}"
            : null;
        avisos.Registrar(new AvisoErrores.Error(
            "Pantalla", "Error de JavaScript", Recortar(dto.Mensaje, 500), Recortar(dto.Pila, 4000),
            Recortar(dto.Ruta, 300), "Pantalla", usuario,
            Recortar($"{dto.Navegador} {(string.IsNullOrWhiteSpace(dto.Version) ? "" : "· versión " + dto.Version)}", 300)));
        return NoContent();
    }

    static string Recortar(string? s, int max) => string.IsNullOrEmpty(s) ? "" : (s.Length <= max ? s : s[..max]);
}
