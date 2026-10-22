namespace LigaManager.Infrastructure.Services;
using System.Net.Http.Json;
using LigaManager.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

// Brevo: API por internet (Railway bloquea el envío por SMTP en el plan gratis).
// Variables: Correo__BrevoApiKey, Correo__Remitente (correo verificado en Brevo), Correo__NombreRemitente.
public class EnvioCorreoBrevo : IEnvioCorreo
{
    private readonly HttpClient _http;
    private readonly string _apiKey, _remitente, _nombre;
    private readonly ILogger<EnvioCorreoBrevo> _log;

    public EnvioCorreoBrevo(HttpClient http, IConfiguration config, ILogger<EnvioCorreoBrevo> log)
    {
        _http = http; _log = log;
        _apiKey    = config["Correo:BrevoApiKey"] ?? "";
        _remitente = config["Correo:Remitente"] ?? "";
        _nombre    = config["Correo:NombreRemitente"] ?? "LigaManager";
    }

    public bool Habilitado => true;

    public async Task<bool> EnviarAsync(string para, string nombre, string asunto, string html, string texto)
    {
        using var req = new HttpRequestMessage(HttpMethod.Post, "https://api.brevo.com/v3/smtp/email")
        {
            Content = JsonContent.Create(new
            {
                sender = new { name = _nombre, email = _remitente },
                to = new[] { new { email = para, name = nombre } },
                subject = asunto,
                htmlContent = html,
                textContent = texto,
            }),
        };
        req.Headers.Add("api-key", _apiKey);
        req.Headers.Add("accept", "application/json");
        try
        {
            using var res = await _http.SendAsync(req);
            if (res.IsSuccessStatusCode) return true;
            _log.LogError("Brevo rechazó el correo ({Estado}): {Detalle}", (int)res.StatusCode, await res.Content.ReadAsStringAsync());
            return false;
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "No se pudo conectar con Brevo.");
            return false;
        }
    }
}

// Envío de prueba (Correo__Modo=Prueba): no manda nada; escribe cada correo en el registro del
// servidor y, si hay Correo__CarpetaPrueba, en un archivo. Para la computadora y GitHub Actions.
public class EnvioCorreoPrueba : IEnvioCorreo
{
    private readonly string? _carpeta;
    private readonly ILogger<EnvioCorreoPrueba> _log;
    public EnvioCorreoPrueba(IConfiguration config, ILogger<EnvioCorreoPrueba> log) { _carpeta = config["Correo:CarpetaPrueba"]; _log = log; }

    public bool Habilitado => true;

    public async Task<bool> EnviarAsync(string para, string nombre, string asunto, string html, string texto)
    {
        _log.LogInformation("Correo de prueba para {Para}: {Asunto}\n{Texto}", para, asunto, texto);
        if (!string.IsNullOrWhiteSpace(_carpeta))
        {
            Directory.CreateDirectory(_carpeta);
            var archivo = Path.Combine(_carpeta, $"{DateTime.UtcNow:yyyyMMddHHmmssfff}_{Guid.NewGuid():N}.json");
            await File.WriteAllTextAsync(archivo, System.Text.Json.JsonSerializer.Serialize(new { para, asunto, texto }));
        }
        return true;
    }
}

// Sin servicio de correo configurado.
public class EnvioCorreoDeshabilitado : IEnvioCorreo
{
    public bool Habilitado => false;
    public Task<bool> EnviarAsync(string para, string nombre, string asunto, string html, string texto) => Task.FromResult(false);
}
