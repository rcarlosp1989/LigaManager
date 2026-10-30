namespace LigaManager.Infrastructure.Services;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using LigaManager.Application.Common;
using LigaManager.Application.DTOs.Auth;
using LigaManager.Application.DTOs.Dirigentes;
using LigaManager.Application.DTOs.Equipos;
using LigaManager.Application.DTOs.Vocales;
using LigaManager.Domain.Entities;
using LigaManager.Infrastructure.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

// Dirigentes: acceso de solo lectura a un campeonato, asociado a un equipo.
//
// - El organizador invita a un dirigente de un equipo inscrito. La invitación es un código
//   de un solo uso que vence a los 7 días; se guarda solo su hash.
// - El dirigente ve el campeonato completo, pero los documentos de identidad solo de los
//   jugadores de su equipo. Esa protección vive aquí, en el servidor: lo que no se envía no
//   puede aparecer en pantalla ni en un PDF o Excel.
// - Los demás reportes los sirven los servicios de siempre; AccesoCampeonato les permite
//   la lectura al dirigente habilitado y le niega cualquier escritura.
public class DirigenteService
{
    private const string Alfabeto = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";   // sin 0/O, 1/I/L
    private static readonly TimeSpan Vigencia = TimeSpan.FromDays(7);

    private readonly LigaManagerContext   _db;
    private readonly IHttpContextAccessor _http;
    private readonly AccesoCampeonato     _acceso;
    private readonly AuthService          _auth;

    public DirigenteService(LigaManagerContext db, IHttpContextAccessor http, AccesoCampeonato acceso, AuthService auth)
    {
        _db = db; _http = http; _acceso = acceso; _auth = auth;
    }

    private int? UsuarioActualId => int.TryParse(_http.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    // ── Códigos ──────────────────────────────────────────────────────────────

    private static string NuevoCodigo()
    {
        var c = new char[10];
        for (var i = 0; i < c.Length; i++) c[i] = Alfabeto[RandomNumberGenerator.GetInt32(Alfabeto.Length)];
        return $"{new string(c, 0, 5)}-{new string(c, 5, 5)}";
    }

    private static string Normalizar(string codigo)
        => new string((codigo ?? "").ToUpperInvariant().Where(char.IsLetterOrDigit).ToArray());

    private static string Hash(string codigo)
        => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(Normalizar(codigo)))).ToLowerInvariant();

    private static string Local(DateTime utc) => (utc + TimeSpan.FromHours(-5)).ToString("yyyy-MM-dd HH:mm");

    // ── Organizador: invitar, listar, anular, quitar ─────────────────────────

    public async Task<ServiceResult<InvitacionDirigenteCreadaDto>> CrearInvitacionAsync(int idCampeonato, CrearInvitacionDirigenteRequest req)
    {
        if (UsuarioActualId is not int yo) return ServiceResult<InvitacionDirigenteCreadaDto>.Fail("Sesión no válida.");
        if (!await _acceso.CampeonatoAsync(idCampeonato)) return ServiceResult<InvitacionDirigenteCreadaDto>.Fail("Campeonato no encontrado.");

        var equipo = await _db.CampeonatoEquipos
            .Where(ce => ce.IdCampeonato == idCampeonato && ce.IdEquipo == req.IdEquipo)
            .Select(ce => ce.Equipo.Nombre).FirstOrDefaultAsync();
        if (equipo is null) return ServiceResult<InvitacionDirigenteCreadaDto>.Fail("Elija un equipo inscrito en este campeonato.");

        var codigo = NuevoCodigo();
        var inv = new InvitacionDirigente
        {
            IdCampeonato = idCampeonato,
            IdEquipo     = req.IdEquipo,
            TokenHash    = Hash(codigo),
            CreadaPor    = yo,
            CreatedAt    = DateTime.UtcNow,
            VenceEn      = DateTime.UtcNow + Vigencia,
        };
        _db.InvitacionesDirigente.Add(inv);
        await _db.SaveChangesAsync();

        return ServiceResult<InvitacionDirigenteCreadaDto>.Ok(new InvitacionDirigenteCreadaDto(
            inv.IdInvitacion, codigo, req.IdEquipo, equipo, Local(inv.VenceEn)));
    }

    public async Task<ServiceResult<DirigentesCampeonatoDto>> ListarAsync(int idCampeonato)
    {
        if (!await _acceso.CampeonatoAsync(idCampeonato)) return ServiceResult<DirigentesCampeonatoDto>.Fail("Campeonato no encontrado.");
        var ahora = DateTime.UtcNow;

        var dirigentes = await _db.CampeonatoDirigentes
            .Where(d => d.IdCampeonato == idCampeonato && d.Activo)
            .OrderBy(d => d.Equipo.Nombre).ThenBy(d => d.Usuario.Nombre)
            .Select(d => new { d.IdUsuario, d.Usuario.Nombre, d.Usuario.Email, d.IdEquipo, Equipo = d.Equipo.Nombre, d.CreatedAt })
            .ToListAsync();

        var invitaciones = await _db.InvitacionesDirigente
            .Where(i => i.IdCampeonato == idCampeonato && !i.Revocada && i.UsadaPor == null && i.VenceEn > ahora)
            .OrderByDescending(i => i.CreatedAt)
            .Select(i => new { i.IdInvitacion, i.IdEquipo, Equipo = i.Equipo.Nombre, i.VenceEn, Creador = i.Creador.Nombre })
            .ToListAsync();

        return ServiceResult<DirigentesCampeonatoDto>.Ok(new DirigentesCampeonatoDto(
            dirigentes.Select(d => new DirigenteDelCampeonatoDto(d.IdUsuario, d.Nombre, d.Email, d.IdEquipo, d.Equipo,
                Local(d.CreatedAt)[..10])).ToList(),
            invitaciones.Select(i => new InvitacionDirigentePendienteDto(i.IdInvitacion, i.IdEquipo, i.Equipo, Local(i.VenceEn), i.Creador)).ToList()));
    }

    public async Task<ServiceResult> RevocarInvitacionAsync(int idCampeonato, int idInvitacion)
    {
        if (!await _acceso.CampeonatoAsync(idCampeonato)) return ServiceResult.Fail("Campeonato no encontrado.");
        var inv = await _db.InvitacionesDirigente.FirstOrDefaultAsync(i => i.IdInvitacion == idInvitacion && i.IdCampeonato == idCampeonato);
        if (inv is null) return ServiceResult.Fail("Invitación no encontrada.");
        inv.Revocada = true;
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    public async Task<ServiceResult> QuitarAsync(int idCampeonato, int idUsuario)
    {
        if (!await _acceso.CampeonatoAsync(idCampeonato)) return ServiceResult.Fail("Campeonato no encontrado.");
        var habilitaciones = await _db.CampeonatoDirigentes
            .Where(d => d.IdCampeonato == idCampeonato && d.IdUsuario == idUsuario && d.Activo).ToListAsync();
        if (habilitaciones.Count == 0) return ServiceResult.Fail("Ese dirigente no tiene acceso a este campeonato.");
        habilitaciones.ForEach(d => d.Activo = false);
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    // ── Invitación: consultar y aceptar (sin sesión o con sesión de dirigente) ──

    private async Task<(InvitacionDirigente? inv, string? motivo)> BuscarVigenteAsync(string codigo)
    {
        var hash = Hash(codigo);
        var inv = await _db.InvitacionesDirigente
            .Include(i => i.Campeonato).Include(i => i.Equipo).Include(i => i.Creador)
            .FirstOrDefaultAsync(i => i.TokenHash == hash);
        if (inv is null) return (null, "El código no es válido.");
        if (inv.Revocada) return (inv, "Esta invitación fue anulada por el organizador.");
        if (inv.UsadaPor != null) return (inv, "Esta invitación ya se usó.");
        if (inv.VenceEn <= DateTime.UtcNow) return (inv, "Esta invitación venció. Solicite una nueva al organizador.");
        return (inv, null);
    }

    public async Task<ServiceResult<InfoInvitacionDirigenteDto>> ConsultarAsync(string codigo)
    {
        var (inv, motivo) = await BuscarVigenteAsync(codigo);
        if (inv is null) return ServiceResult<InfoInvitacionDirigenteDto>.Fail(motivo!);
        var organizador = await _db.Usuarios.Where(u => u.IdUsuario == inv.Campeonato.IdUsuarioCreador)
            .Select(u => u.Nombre).FirstOrDefaultAsync() ?? inv.Creador.Nombre;
        return ServiceResult<InfoInvitacionDirigenteDto>.Ok(new InfoInvitacionDirigenteDto(
            inv.Campeonato.Nombre, organizador, inv.Equipo.Nombre, Local(inv.VenceEn), motivo is null, motivo));
    }

    public async Task<ServiceResult<LoginResponse>> AceptarAsync(string codigo, AceptarInvitacionRequest req)
    {
        var (inv, motivo) = await BuscarVigenteAsync(codigo);
        if (inv is null || motivo is not null) return ServiceResult<LoginResponse>.Fail(motivo!);

        Usuario? usuario;
        if (UsuarioActualId is int yo)
        {
            usuario = await _db.Usuarios.FirstOrDefaultAsync(u => u.IdUsuario == yo && u.Activo);
            if (usuario is null) return ServiceResult<LoginResponse>.Fail("Sesión no válida.");
            if (usuario.Rol != RolUsuario.Dirigente)
                return ServiceResult<LoginResponse>.Fail("Esta invitación es para una cuenta de dirigente. Cierre sesión e ingrese con otra cuenta, o cree una nueva.");
        }
        else
        {
            var email = req.Email?.ToLower().Trim() ?? "";
            var password = req.Password ?? "";
            if (email.Length == 0 || password.Length == 0)
                return ServiceResult<LoginResponse>.Fail("Email y contraseña son requeridos.");

            usuario = await _db.Usuarios.FirstOrDefaultAsync(u => u.Email == email);
            if (usuario is not null)
            {
                if (!usuario.Activo || !BCrypt.Net.BCrypt.Verify(password, usuario.PasswordHash))
                    return ServiceResult<LoginResponse>.Fail("Ya existe una cuenta con ese email y la contraseña no coincide.");
                if (usuario.Rol != RolUsuario.Dirigente)
                    return ServiceResult<LoginResponse>.Fail("Ese correo ya pertenece a otra cuenta (organizador o vocal). Use otro correo para la cuenta de dirigente.");
            }
            else
            {
                var nombre = req.Nombre?.Trim() ?? "";
                if (nombre.Length == 0) return ServiceResult<LoginResponse>.Fail("Escriba su nombre para crear la cuenta.");
                if (nombre.Length > 100 || email.Length > 150) return ServiceResult<LoginResponse>.Fail("Nombre o email demasiado largos.");
                if (!System.Text.RegularExpressions.Regex.IsMatch(email, @"^[^@\s]+@[^@\s]+\.[^@\s]+$"))
                    return ServiceResult<LoginResponse>.Fail("El email no es válido.");
                if (password.Length < 6) return ServiceResult<LoginResponse>.Fail("La contraseña debe tener al menos 6 caracteres.");
                usuario = new Usuario
                {
                    Nombre = nombre, Email = email, PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
                    Rol = RolUsuario.Dirigente, Activo = true, CreatedAt = DateTime.UtcNow,
                };
                _db.Usuarios.Add(usuario);
                await _db.SaveChangesAsync();
            }
        }

        // Un dirigente tiene un solo equipo por campeonato: una invitación nueva lo reemplaza.
        var anteriores = await _db.CampeonatoDirigentes
            .Where(d => d.IdCampeonato == inv.IdCampeonato && d.IdUsuario == usuario.IdUsuario && d.Activo).ToListAsync();
        anteriores.ForEach(d => d.Activo = false);
        _db.CampeonatoDirigentes.Add(new CampeonatoDirigente
        {
            IdCampeonato = inv.IdCampeonato, IdUsuario = usuario.IdUsuario, IdEquipo = inv.IdEquipo,
            Activo = true, CreadoPor = inv.CreadaPor, CreatedAt = DateTime.UtcNow,
        });
        inv.UsadaPor = usuario.IdUsuario;
        inv.UsadaEn  = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return ServiceResult<LoginResponse>.Ok(_auth.GenerarRespuesta(usuario, recordarme: true));
    }

    // ── Vista del dirigente ──────────────────────────────────────────────────

    public async Task<DirigenteInicioDto> InicioAsync()
    {
        var yo = UsuarioActualId ?? 0;
        var campeonatos = await _db.CampeonatoDirigentes
            .Where(d => d.IdUsuario == yo && d.Activo)
            .OrderByDescending(d => d.Campeonato.FechaInicio)
            .Select(d => new { d.Campeonato, d.IdEquipo, Equipo = d.Equipo.Nombre, d.Equipo.LogoUrl })
            .ToListAsync();
        return new DirigenteInicioDto(campeonatos.Select(c => new DirigenteCampeonatoDto(
            c.Campeonato.IdCampeonato, c.Campeonato.Nombre, c.Campeonato.Anio, c.Campeonato.Estado.ToString(),
            c.Campeonato.FechaInicio.ToString("yyyy-MM-dd"), c.Campeonato.FechaFin.ToString("yyyy-MM-dd"),
            c.IdEquipo, c.Equipo, c.LogoUrl)).ToList());
    }

    public async Task<ServiceResult<DirigenteCampeonatoDetalleDto>> CampeonatoAsync(int idCampeonato)
    {
        if (await _acceso.EquipoDelDirigenteAsync(idCampeonato) is not int propio)
            return ServiceResult<DirigenteCampeonatoDetalleDto>.Fail("Campeonato no encontrado.");

        var c = await _db.Campeonatos
            .Include(x => x.ModalidadDeportiva)
            .Include(x => x.Equipos).ThenInclude(ce => ce.Equipo).ThenInclude(e => e.Pais)
            .FirstAsync(x => x.IdCampeonato == idCampeonato);
        var equipoPropio = c.Equipos.FirstOrDefault(ce => ce.IdEquipo == propio)?.Equipo
            ?? await _db.Equipos.FirstAsync(e => e.IdEquipo == propio);

        var hoy = HoraLocal.Hoy.ToDateTime(TimeOnly.MinValue);
        var partidos = _db.Partidos.Where(p => p.Jornada.IdCampeonato == idCampeonato
            && (p.IdEquipoLocal == propio || p.IdEquipoVisitante == propio));

        var proximos = await AProyeccion(partidos.Where(p => !p.Jugado && p.Fecha >= hoy).OrderBy(p => p.Fecha)).Take(3).ToListAsync();
        var ultimos  = await AProyeccion(partidos.Where(p => p.Jugado).OrderByDescending(p => p.Fecha)).Take(5).ToListAsync();

        return ServiceResult<DirigenteCampeonatoDetalleDto>.Ok(new DirigenteCampeonatoDetalleDto(
            c.IdCampeonato, c.Nombre, c.Anio, c.Estado.ToString(),
            c.FechaInicio.ToString("yyyy-MM-dd"), c.FechaFin.ToString("yyyy-MM-dd"),
            c.ModalidadDeportiva.Nombre,
            propio, equipoPropio.Nombre, equipoPropio.LogoUrl,
            c.Equipos.OrderBy(ce => ce.Equipo.Nombre)
                .Select(ce => new DirigenteEquipoDto(ce.IdEquipo, ce.Equipo.Nombre, ce.Equipo.Pais.Nombre, ce.Equipo.LogoUrl)).ToList(),
            proximos, ultimos, c.TokenAficionados));
    }

    private static IQueryable<DirigentePartidoDto> AProyeccion(IQueryable<Partido> q)
        => q.Select(p => new DirigentePartidoDto(
            p.IdPartido, p.IdJornada, p.Jornada.Numero,
            p.IdEquipoLocal, p.EquipoLocal.Nombre, p.IdEquipoVisitante, p.EquipoVisitante.Nombre,
            p.EquipoLocal.LogoUrl, p.EquipoVisitante.LogoUrl,
            p.Fecha.ToString("yyyy-MM-dd HH:mm"),
            p.Estadio != null ? p.Estadio.Nombre : null,
            p.Jugado, p.Desierto, p.GolesLocal, p.GolesVisitante));

    // Nómina del equipo del dirigente. Por ahora solo puede ver la de su propio equipo (la de
    // los demás se rechaza) y sin documentos de identidad: ni el número ni el tipo se envían.
    public async Task<ServiceResult<EquipoDetalleDto>> NominaAsync(int idCampeonato, int idEquipo)
    {
        if (await _acceso.EquipoDelDirigenteAsync(idCampeonato) is not int propio)
            return ServiceResult<EquipoDetalleDto>.Fail("Campeonato no encontrado.");
        if (idEquipo != propio)
            return ServiceResult<EquipoDetalleDto>.Fail("Solo puede ver la nómina de su equipo.");

        var e = await _db.Equipos.Include(x => x.Pais).FirstAsync(x => x.IdEquipo == idEquipo);
        var jugadores = await _db.JugadorEquipos
            .Where(je => je.IdEquipo == idEquipo && je.FechaHasta == null)
            .Select(je => new
            {
                je.IdJugador, je.Jugador.Persona.Nombre, je.Jugador.Persona.Apellido, je.FechaDesde, je.FechaHasta,
                je.Dorsal, je.Posicion, je.Jugador.Persona.FechaNac, je.Jugador.Persona.FotoUrl,
            })
            .ToListAsync();

        return ServiceResult<EquipoDetalleDto>.Ok(new EquipoDetalleDto(
            e.IdEquipo, e.Nombre, e.IdPais, e.Pais.Nombre,
            // Nombres cortos (primer nombre y primer apellido), como en el resto de la vista del dirigente.
            jugadores.Select(j => new JugadorEnEquipoDto(
                j.IdJugador, NombreCorto.PrimerNombre(j.Nombre), NombreCorto.PrimerApellido(j.Apellido), j.FechaDesde.ToString("yyyy-MM-dd"), j.FechaHasta?.ToString("yyyy-MM-dd"),
                j.Dorsal,
                "",   // sin documento
                j.Posicion, Edad(j.FechaNac), j.FotoUrl,
                "")).ToList(),
            e.LogoUrl));
    }

    // Jornada del campeonato (solo lectura). Se comprueba que pertenezca al campeonato pedido.
    public async Task<bool> JornadaDelCampeonatoAsync(int idCampeonato, int idJornada)
        => await _db.Jornadas.AnyAsync(j => j.IdJornada == idJornada && j.IdCampeonato == idCampeonato);

    private static int Edad(DateOnly nacimiento)
    {
        var hoy = HoraLocal.Hoy;
        var edad = hoy.Year - nacimiento.Year;
        if (nacimiento > hoy.AddYears(-edad)) edad--;
        return edad;
    }
}
