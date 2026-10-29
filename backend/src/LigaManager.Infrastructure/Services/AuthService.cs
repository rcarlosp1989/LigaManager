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
using System.Net;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

// Cuentas: iniciar sesión, registrarse, confirmar el correo y restablecer la contraseña.
//
// - Sesión: con «Recordarme» dura 7 días; sin marcar, 12 horas.
// - Confirmar el correo: solo organizadores nuevos y solo si hay servicio de correo. Las cuentas que
//   ya existían, los vocales y los dirigentes quedan confirmados.
// - Restablecer la contraseña: para todos. Al cambiarla se cierran todas las sesiones de la cuenta
//   (Program.cs compara la fecha del token con ClaveCambiadaEn).
// - Los enlaces por correo son de un solo uso; se guarda solo su hash.
public class AuthService : IAuthService
{
    public const string ErrorCorreoSinConfirmar = "CORREO_SIN_CONFIRMAR";
    public const string ClaimEmitido = "emitido";   // segundos Unix en que se emitió el token

    private static readonly TimeSpan VigenciaConfirmacion = TimeSpan.FromHours(24);
    private static readonly TimeSpan VigenciaRestablecer  = TimeSpan.FromHours(1);
    private static readonly TimeSpan EsperaEntreCorreos   = TimeSpan.FromSeconds(60);
    private const int CorreosPorDia = 5;

    private readonly LigaManagerContext _db;
    private readonly IConfiguration     _config;
    private readonly IEnvioCorreo       _correo;

    public AuthService(LigaManagerContext db, IConfiguration config, IEnvioCorreo correo)
    {
        _db     = db;
        _config = config;
        _correo = correo;
    }

    private static string Normalizar(string? email) => email?.ToLower().Trim() ?? "";

    public OpcionesAuthDto Opciones() => new(_correo.Habilitado);

    // ── Iniciar sesión y registrarse ─────────────────────────────────────────

    public async Task<ServiceResult<LoginResponse>> LoginAsync(LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Password))
            return ServiceResult<LoginResponse>.Fail("Email y contraseña son requeridos.");

        var usuario = await _db.Usuarios
            .FirstOrDefaultAsync(u => u.Email == Normalizar(request.Email) && u.Activo);

        if (usuario is null || !BCrypt.Net.BCrypt.Verify(request.Password, usuario.PasswordHash))
            return ServiceResult<LoginResponse>.Fail("Credenciales incorrectas.");

        // Sin servicio de correo no se podría confirmar: no se exige.
        if (!usuario.EmailVerificado && _correo.Habilitado)
            return ServiceResult<LoginResponse>.Fail(ErrorCorreoSinConfirmar);

        return ServiceResult<LoginResponse>.Ok(GenerarRespuesta(usuario, request.Recordarme));
    }

    public async Task<ServiceResult<RegistroResultado>> RegisterAsync(RegisterRequest request)
    {
        var nombre   = request.Nombre?.Trim() ?? "";
        var email    = Normalizar(request.Email);
        var password = request.Password ?? "";

        if (nombre.Length == 0 || email.Length == 0 || password.Length == 0)
            return ServiceResult<RegistroResultado>.Fail("Nombre, email y contraseña son requeridos.");
        if (nombre.Length > 100 || email.Length > 150)
            return ServiceResult<RegistroResultado>.Fail("Nombre o email demasiado largos.");
        if (!System.Text.RegularExpressions.Regex.IsMatch(email, @"^[^@\s]+@[^@\s]+\.[^@\s]+$"))
            return ServiceResult<RegistroResultado>.Fail("El email no es válido.");
        if (password.Length < 6)
            return ServiceResult<RegistroResultado>.Fail("La contraseña debe tener al menos 6 caracteres.");
        if (!request.AceptaTerminos)
            return ServiceResult<RegistroResultado>.Fail("Para crear la cuenta debe aceptar los términos de uso y el aviso de privacidad.");

        if (await _db.Usuarios.AnyAsync(u => u.Email == email))
            return ServiceResult<RegistroResultado>.Fail("Ya existe una cuenta con ese email.");

        var confirmar = _correo.Habilitado;
        var usuario = new Usuario
        {
            Nombre       = nombre,
            Email        = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            Rol          = RolUsuario.Organizador,
            Activo       = true,
            CreatedAt    = DateTime.UtcNow,
            TerminosAceptadosEn = DateTime.UtcNow,
            TerminosVersion     = Terminos.Version,
            EmailVerificado     = !confirmar,
        };

        try
        {
            _db.Usuarios.Add(usuario);
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return ServiceResult<RegistroResultado>.Fail("Ya existe una cuenta con ese email.");
        }

        if (!confirmar)
            return ServiceResult<RegistroResultado>.Ok(new RegistroResultado(GenerarRespuesta(usuario), false, email));

        await EnviarConfirmacionAsync(usuario);
        return ServiceResult<RegistroResultado>.Ok(new RegistroResultado(null, true, email));
    }

    // ── Enlaces por correo ───────────────────────────────────────────────────

    private static string NuevoCodigo()
        => Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static string Hash(string codigo)
        => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(codigo ?? ""))).ToLowerInvariant();

    private string UrlFrontend => (_config["App:UrlFrontend"] ?? "http://localhost:5173").TrimEnd('/');

    // Crea un enlace nuevo (anula los anteriores sin usar del mismo tipo) y devuelve el código, o
    // null si se pidió hace menos de un minuto o ya se enviaron demasiados hoy.
    private async Task<string?> NuevoEnlaceAsync(Usuario usuario, TipoTokenUsuario tipo, TimeSpan vigencia)
    {
        var ahora = DateTime.UtcNow;
        var recientes = await _db.TokenesUsuario
            .Where(t => t.IdUsuario == usuario.IdUsuario && t.Tipo == tipo && t.CreadoEn > ahora.AddDays(-1))
            .ToListAsync();
        if (recientes.Count >= CorreosPorDia || recientes.Any(t => t.CreadoEn > ahora - EsperaEntreCorreos)) return null;

        foreach (var t in recientes.Where(t => t.UsadoEn == null)) t.UsadoEn = ahora;   // solo vale el último
        var codigo = NuevoCodigo();
        _db.TokenesUsuario.Add(new TokenUsuario
        {
            IdUsuario = usuario.IdUsuario, Tipo = tipo, TokenHash = Hash(codigo),
            VenceEn = ahora + vigencia, CreadoEn = ahora,
        });
        await _db.SaveChangesAsync();
        return codigo;
    }

    private string Correo(string saludo, string parrafo, string boton, string enlace, string pie) => $"""
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1f2937">
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px"><tr>
            <td style="padding-right:10px"><img src="{UrlFrontend}/marca-correo.png" width="36" height="40" alt="" style="display:block"></td>
            <td style="font-family:'Arial Narrow',Arial,Helvetica,sans-serif;font-size:28px;font-weight:bold;font-style:italic;color:#0b1220">Liga<span style="color:#0f766e">Manager</span></td>
          </tr></table>
          <p>{WebUtility.HtmlEncode(saludo)}</p>
          <p>{WebUtility.HtmlEncode(parrafo)}</p>
          <p style="margin:24px 0">
            <a href="{enlace}" style="background:#0f9f91;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">{WebUtility.HtmlEncode(boton)}</a>
          </p>
          <p style="font-size:13px;color:#6b7280">Si el botón no funciona, copie este enlace en su navegador:<br>{enlace}</p>
          <p style="font-size:13px;color:#6b7280">{WebUtility.HtmlEncode(pie)}</p>
        </div>
        """;

    private async Task EnviarConfirmacionAsync(Usuario usuario)
    {
        if (await NuevoEnlaceAsync(usuario, TipoTokenUsuario.VerificarCorreo, VigenciaConfirmacion) is not string codigo) return;
        var enlace = $"{UrlFrontend}/confirmar-correo/{codigo}";
        var saludo = $"Estimado/a {usuario.Nombre}:";
        const string parrafo = "Confirme su correo para activar su cuenta de LigaManager. El enlace tiene una validez de 24 horas y puede usarse una sola vez.";
        const string pie = "Si usted no creó esta cuenta, puede ignorar este mensaje.";
        await _correo.EnviarAsync(usuario.Email, usuario.Nombre, "Confirme su correo en LigaManager",
            Correo(saludo, parrafo, "Confirmar mi correo", enlace, pie),
            $"{saludo}\n\n{parrafo}\n\n{enlace}\n\n{pie}");
    }

    private async Task EnviarRestablecerAsync(Usuario usuario)
    {
        if (await NuevoEnlaceAsync(usuario, TipoTokenUsuario.RestablecerClave, VigenciaRestablecer) is not string codigo) return;
        var enlace = $"{UrlFrontend}/restablecer/{codigo}";
        var saludo = $"Estimado/a {usuario.Nombre}:";
        const string parrafo = "Recibimos una solicitud para restablecer la contraseña de su cuenta de LigaManager. El enlace tiene una validez de 1 hora y puede usarse una sola vez.";
        const string pie = "Si usted no realizó esta solicitud, puede ignorar este mensaje: su contraseña no cambiará.";
        await _correo.EnviarAsync(usuario.Email, usuario.Nombre, "Restablezca su contraseña de LigaManager",
            Correo(saludo, parrafo, "Elegir nueva contraseña", enlace, pie),
            $"{saludo}\n\n{parrafo}\n\n{enlace}\n\n{pie}");
    }

    // Busca un enlace vigente del tipo pedido.
    private async Task<(TokenUsuario? t, string? motivo)> BuscarAsync(string codigo, TipoTokenUsuario tipo)
    {
        if (string.IsNullOrWhiteSpace(codigo) || codigo.Length > 100) return (null, "El enlace no es válido.");
        var hash = Hash(codigo);
        var t = await _db.TokenesUsuario.Include(x => x.Usuario).FirstOrDefaultAsync(x => x.TokenHash == hash && x.Tipo == tipo);
        if (t is null || !t.Usuario.Activo) return (null, "El enlace no es válido.");
        if (t.UsadoEn != null) return (null, "Este enlace ya se usó o fue reemplazado por uno más nuevo.");
        if (t.VenceEn <= DateTime.UtcNow) return (null, "Este enlace venció. Solicite uno nuevo.");
        return (t, null);
    }

    public async Task<ServiceResult<LoginResponse>> ConfirmarCorreoAsync(string codigo)
    {
        var (t, motivo) = await BuscarAsync(codigo, TipoTokenUsuario.VerificarCorreo);
        if (t is null) return ServiceResult<LoginResponse>.Fail(motivo!);
        t.UsadoEn = DateTime.UtcNow;
        t.Usuario.EmailVerificado = true;
        await _db.SaveChangesAsync();
        return ServiceResult<LoginResponse>.Ok(GenerarRespuesta(t.Usuario));
    }

    // Siempre responde igual (no revela si el correo existe); solo envía si corresponde.
    public async Task ReenviarConfirmacionAsync(string email)
    {
        if (!_correo.Habilitado) return;
        var usuario = await _db.Usuarios.FirstOrDefaultAsync(u => u.Email == Normalizar(email) && u.Activo);
        if (usuario is null || usuario.EmailVerificado) return;
        await EnviarConfirmacionAsync(usuario);
    }

    public async Task OlvideClaveAsync(string email)
    {
        if (!_correo.Habilitado) return;
        var usuario = await _db.Usuarios.FirstOrDefaultAsync(u => u.Email == Normalizar(email) && u.Activo);
        if (usuario is null) return;
        await EnviarRestablecerAsync(usuario);
    }

    public async Task<EnlaceValidoDto> ValidarRestablecerAsync(string codigo)
    {
        var (t, motivo) = await BuscarAsync(codigo, TipoTokenUsuario.RestablecerClave);
        return new EnlaceValidoDto(t is not null, motivo);
    }

    public async Task<ServiceResult<LoginResponse>> RestablecerAsync(RestablecerRequest req)
    {
        if ((req.Password ?? "").Length < 6)
            return ServiceResult<LoginResponse>.Fail("La contraseña debe tener al menos 6 caracteres.");
        var (t, motivo) = await BuscarAsync(req.Token, TipoTokenUsuario.RestablecerClave);
        if (t is null) return ServiceResult<LoginResponse>.Fail(motivo!);

        var ahora = DateTime.UtcNow;
        t.UsadoEn = ahora;
        var u = t.Usuario;
        u.PasswordHash    = BCrypt.Net.BCrypt.HashPassword(req.Password);
        u.ClaveCambiadaEn = DateTime.SpecifyKind(new DateTime(ahora.Ticks - ahora.Ticks % TimeSpan.TicksPerSecond), DateTimeKind.Utc);
        u.EmailVerificado = true;   // abrió un enlace enviado a su correo
        await _db.SaveChangesAsync();
        return ServiceResult<LoginResponse>.Ok(GenerarRespuesta(u));
    }

    // ── Términos de uso (organizadores) ─────────────────────────────────────

    public async Task<TerminosDto?> TerminosAsync(int idUsuario)
    {
        var u = await _db.Usuarios.AsNoTracking().FirstOrDefaultAsync(x => x.IdUsuario == idUsuario && x.Activo);
        return u is null ? null : new TerminosDto(Terminos.Version, u.TerminosAceptadosEn, u.TerminosVersion != Terminos.Version);
    }

    public async Task<ServiceResult<TerminosDto>> AceptarTerminosAsync(int idUsuario, AceptarTerminosRequest req)
    {
        if (req.Version != Terminos.Version)
            return ServiceResult<TerminosDto>.Fail("Los términos cambiaron. Recargue la página para leer la versión vigente.");
        var u = await _db.Usuarios.FirstOrDefaultAsync(x => x.IdUsuario == idUsuario && x.Activo);
        if (u is null) return ServiceResult<TerminosDto>.Fail("Sesión no válida.");
        if (u.TerminosVersion != Terminos.Version)
        {
            u.TerminosAceptadosEn = DateTime.UtcNow;
            u.TerminosVersion     = Terminos.Version;
            await _db.SaveChangesAsync();
        }
        return ServiceResult<TerminosDto>.Ok(new TerminosDto(Terminos.Version, u.TerminosAceptadosEn, false));
    }

    // ── Token de sesión ──────────────────────────────────────────────────────

    // También la usan las invitaciones de vocal y dirigente para iniciar la sesión.
    // Recordarme: 7 días; si no, 12 horas.
    public LoginResponse GenerarRespuesta(Usuario usuario, bool recordarme = false)
    {
        var jwt    = _config.GetSection("JwtSettings");
        var key    = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt["SecretKey"]!));
        var ahora  = DateTime.UtcNow;
        var expira = ahora + (recordarme ? TimeSpan.FromDays(7) : TimeSpan.FromHours(12));

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, usuario.IdUsuario.ToString()),
            new Claim(ClaimTypes.Email,          usuario.Email),
            new Claim(ClaimTypes.Name,           usuario.Nombre),
            new Claim(ClaimTypes.Role,           usuario.Rol.ToString()),
            new Claim(ClaimEmitido,              new DateTimeOffset(ahora).ToUnixTimeSeconds().ToString()),
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
