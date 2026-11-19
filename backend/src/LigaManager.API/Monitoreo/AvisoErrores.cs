namespace LigaManager.API.Monitoreo;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using LigaManager.Application.Interfaces;
using Microsoft.Extensions.Caching.Memory;

// Avisos de errores en producción, por correo (Brevo, el mismo de la app).
//
// Recibe los errores internos del servidor (500) y los de la pantalla que manda el navegador.
// Cada error se anota en el registro de Railway y, si está configurado Avisos__Correo, se avisa por
// correo con estos límites, para no llenar el buzón:
//   - el mismo error (misma «huella»: origen, tipo, mensaje y ruta, sin números) avisa una vez por
//     hora; el correo siguiente dice cuántas veces se repitió mientras tanto;
//   - como máximo MaxPorDia correos al día en total.
// Los contadores viven en memoria: si Railway reinicia el servicio, empiezan de cero.
// Nunca lanza: un fallo al avisar no debe romper la petición que falló.
public sealed partial class AvisoErrores
{
    public const int MaxPorDia = 20;
    static readonly TimeSpan Silencio = TimeSpan.FromHours(1);

    readonly IMemoryCache _cache;
    readonly IServiceScopeFactory _scopes;
    readonly ILogger<AvisoErrores> _log;
    readonly string? _destino;
    readonly string _ambiente;
    readonly object _candado = new();
    DateOnly _dia;
    int _enviadosHoy;

    public AvisoErrores(IMemoryCache cache, IServiceScopeFactory scopes, IConfiguration config,
                        ILogger<AvisoErrores> log, IHostEnvironment env)
    {
        _cache = cache; _scopes = scopes; _log = log;
        _destino = config["Avisos:Correo"]?.Trim();
        _ambiente = Environment.GetEnvironmentVariable("RAILWAY_ENVIRONMENT") ?? env.EnvironmentName;
    }

    public bool ConDestino => !string.IsNullOrWhiteSpace(_destino);

    public sealed record Error(string Origen, string Tipo, string Mensaje, string? Detalle,
                               string? Ruta, string? Metodo, string? Usuario, string? Navegador);

    // Anota el error y, si toca, manda el correo en segundo plano.
    public void Registrar(Error e)
    {
        try
        {
            var huella = Huella(e);
            _log.LogError("[{Origen}] {Tipo}: {Mensaje} en {Metodo} {Ruta} (huella {Huella})",
                          e.Origen, e.Tipo, e.Mensaje, e.Metodo, e.Ruta, huella);
            if (!ConDestino) return;

            // Repetido dentro de la hora: solo se cuenta.
            var clave = "aviso-error:" + huella;
            if (_cache.TryGetValue(clave, out Contador? c) && c is not null)
            {
                Interlocked.Increment(ref c.Repetido);
                return;
            }
            var repetidoAntes = _cache.TryGetValue("aviso-error-rep:" + huella, out int r) ? r : 0;
            lock (_candado)
            {
                var hoy = DateOnly.FromDateTime(AhoraEcuador());
                if (hoy != _dia) { _dia = hoy; _enviadosHoy = 0; }
                if (_enviadosHoy >= MaxPorDia) return;
                _enviadosHoy++;
            }
            var nuevo = new Contador();
            _cache.Set(clave, nuevo, new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = Silencio,
                PostEvictionCallbacks =
                {
                    // Al vencer la hora, lo repetido pasa al próximo correo de esa huella.
                    new PostEvictionCallbackRegistration
                    {
                        EvictionCallback = (_, v, _, _) =>
                        {
                            if (v is Contador cc && cc.Repetido > 0)
                                _cache.Set("aviso-error-rep:" + huella, cc.Repetido, TimeSpan.FromDays(1));
                        },
                    },
                },
            });
            _cache.Remove("aviso-error-rep:" + huella);
            _ = Task.Run(() => EnviarAsync(e, huella, repetidoAntes));
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "No se pudo procesar el aviso de error");
        }
    }

    sealed class Contador { public int Repetido; }

    async Task EnviarAsync(Error e, string huella, int repetidoAntes)
    {
        try
        {
            using var scope = _scopes.CreateScope();
            var correo = scope.ServiceProvider.GetRequiredService<IEnvioCorreo>();
            if (!correo.Habilitado) return;
            var cuando = AhoraEcuador().ToString("dd/MM/yyyy HH:mm");
            var lugar = e.Origen == "Pantalla" ? "en la pantalla" : "en el servidor";
            var asunto = $"[LigaManager] Error {lugar}: {Corto(e.Mensaje, 70)}";
            var filas = new List<(string, string)>
            {
                ("Cuándo", $"{cuando} (hora de Ecuador)"),
                ("Dónde", $"{e.Metodo} {e.Ruta}".Trim()),
                ("Tipo", e.Tipo),
                ("Usuario", e.Usuario ?? "sin sesión"),
                ("Ambiente", _ambiente),
                ("Huella", huella),
            };
            if (!string.IsNullOrWhiteSpace(e.Navegador)) filas.Add(("Navegador", Corto(e.Navegador, 160)));
            if (repetidoAntes > 0) filas.Add(("Antes de este aviso", $"se repitió {repetidoAntes} veces en la última hora"));

            var html = new StringBuilder();
            html.Append("<div style=\"font-family:Arial,sans-serif;font-size:14px;color:#111\">");
            html.Append($"<h2 style=\"margin:0 0 8px\">Error {lugar}</h2>");
            html.Append($"<p style=\"margin:0 0 12px\"><b>{WebUtility.HtmlEncode(Corto(e.Mensaje, 500))}</b></p>");
            html.Append("<table style=\"border-collapse:collapse\">");
            foreach (var (k, v) in filas)
                html.Append($"<tr><td style=\"padding:2px 12px 2px 0;color:#555\">{k}</td><td>{WebUtility.HtmlEncode(v)}</td></tr>");
            html.Append("</table>");
            if (!string.IsNullOrWhiteSpace(e.Detalle))
                html.Append($"<pre style=\"background:#f4f4f5;padding:10px;font-size:12px;white-space:pre-wrap\">{WebUtility.HtmlEncode(Primeras(e.Detalle, 30))}</pre>");
            html.Append("<p style=\"color:#555;font-size:12px\">El mismo error avisa como máximo una vez por hora. ")
                .Append($"Máximo {MaxPorDia} avisos por día. El registro completo está en Railway → LigaManager → Logs.</p></div>");

            var texto = $"Error {lugar}: {e.Mensaje}\n" + string.Join("\n", filas.Select(f => $"{f.Item1}: {f.Item2}"))
                      + (string.IsNullOrWhiteSpace(e.Detalle) ? "" : "\n\n" + Primeras(e.Detalle, 30));
            await correo.EnviarAsync(_destino!, "Administrador", asunto, html.ToString(), texto);
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "No se pudo enviar el aviso de error {Huella}", huella);
        }
    }

    // La huella agrupa errores iguales aunque cambien números (ids, minutos, líneas).
    static string Huella(Error e)
    {
        var baseTexto = $"{e.Origen}|{e.Tipo}|{SinNumeros(e.Mensaje)}|{SinNumeros(e.Ruta ?? "")}";
        var hash = SHA1.HashData(Encoding.UTF8.GetBytes(baseTexto));
        return Convert.ToHexString(hash)[..10].ToLowerInvariant();
    }

    [GeneratedRegex(@"\d+")]
    private static partial Regex Numeros();
    static string SinNumeros(string s) => Numeros().Replace(s, "#");

    static string Corto(string s, int max) => s.Length <= max ? s : s[..max] + "…";
    static string Primeras(string s, int lineas) => string.Join('\n', s.Split('\n').Take(lineas));

    static DateTime AhoraEcuador() => DateTime.UtcNow.AddHours(-5);
}
