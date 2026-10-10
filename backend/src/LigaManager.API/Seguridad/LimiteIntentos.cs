namespace LigaManager.API.Seguridad;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Caching.Memory;

// Límite de intentos fallidos en las rutas públicas (código de invitación e inicio de sesión).
//
// Cuenta los intentos que fallan (400, 401, 404) por dirección IP y por grupo. Al llegar a
// MaxFallos dentro de la ventana, esa IP queda bloqueada en ese grupo hasta que la ventana
// termine y recibe 429 sin que se consulte la base de datos. Un intento correcto borra la cuenta.
//
// Los contadores viven en la memoria del servidor: si Railway reinicia el servicio, se borran.
// Es suficiente para frenar a quien prueba códigos o claves al azar.
public sealed class LimiteIntentos
{
    public const int MaxFallos = 10;
    public static readonly TimeSpan Ventana = TimeSpan.FromMinutes(15);

    private readonly IMemoryCache _cache;
    public LimiteIntentos(IMemoryCache cache) => _cache = cache;

    private sealed class Contador { public int Fallos; public DateTimeOffset Hasta; }

    private static string Clave(string grupo, string ip) => $"limite:{grupo}:{ip}";

    // Si está bloqueada, devuelve cuánto falta para que se libere.
    public TimeSpan? Bloqueo(string grupo, string ip)
    {
        if (_cache.TryGetValue(Clave(grupo, ip), out Contador? c) && c!.Fallos >= MaxFallos)
        {
            var falta = c.Hasta - DateTimeOffset.UtcNow;
            return falta > TimeSpan.Zero ? falta : null;
        }
        return null;
    }

    public void Fallo(string grupo, string ip)
    {
        var clave = Clave(grupo, ip);
        lock (_cache)
        {
            if (!_cache.TryGetValue(clave, out Contador? c) || c!.Hasta <= DateTimeOffset.UtcNow)
            {
                c = new Contador { Hasta = DateTimeOffset.UtcNow + Ventana };
                _cache.Set(clave, c, c.Hasta);
            }
            c.Fallos++;
        }
    }

    public void Acierto(string grupo, string ip) => _cache.Remove(Clave(grupo, ip));
}

// [LimitarIntentos("invitacion")] sobre una acción. Corre antes de leer el cuerpo de la
// petición, así una IP bloqueada no llega a la base de datos.
[AttributeUsage(AttributeTargets.Method)]
public sealed class LimitarIntentosAttribute : Attribute, IAsyncResourceFilter
{
    private readonly string _grupo;
    public LimitarIntentosAttribute(string grupo) => _grupo = grupo;

    public async Task OnResourceExecutionAsync(ResourceExecutingContext ctx, ResourceExecutionDelegate next)
    {
        var limite = ctx.HttpContext.RequestServices.GetRequiredService<LimiteIntentos>();
        var ip = ctx.HttpContext.Connection.RemoteIpAddress?.ToString() ?? "desconocida";

        if (limite.Bloqueo(_grupo, ip) is TimeSpan falta)
        {
            var minutos = (int)Math.Ceiling(falta.TotalMinutes);
            ctx.HttpContext.Response.Headers.RetryAfter = ((int)Math.Ceiling(falta.TotalSeconds)).ToString();
            ctx.Result = new ObjectResult(new
            {
                error = $"Demasiados intentos fallidos. Espera {minutos} {(minutos == 1 ? "minuto" : "minutos")} e inténtalo de nuevo."
            }) { StatusCode = StatusCodes.Status429TooManyRequests };
            return;
        }

        await next();

        var status = ctx.HttpContext.Response.StatusCode;
        if (status is 400 or 401 or 404) limite.Fallo(_grupo, ip);
        else if (status is >= 200 and < 300) limite.Acierto(_grupo, ip);
    }
}
