namespace LigaManager.Infrastructure.Services;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using LigaManager.Application.Common;
using LigaManager.Application.DTOs.Auth;
using LigaManager.Application.DTOs.Equipos;
using LigaManager.Application.DTOs.Partidos;
using LigaManager.Application.DTOs.Vocales;
using LigaManager.Application.Interfaces;
using LigaManager.Domain.Entities;
using LigaManager.Infrastructure.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

// Fase 7: vocales (jueces de mesa) por campeonato.
//
// - El organizador invita a un vocal TITULAR (vale mientras dure el campeonato) o a un
//   REEMPLAZO para un día. El titular también puede crear la invitación de reemplazo.
// - La invitación es un código de un solo uso. Se guarda solo su hash.
// - El vocal registra únicamente el día de cada partido (hora de Ecuador). Esa regla vive
//   en AccesoCampeonato, que también usan los métodos de JornadaService.
public class VocalService
{
    private const string Alfabeto = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";   // sin 0/O, 1/I/L

    private readonly LigaManagerContext   _db;
    private readonly IHttpContextAccessor _http;
    private readonly AccesoCampeonato     _acceso;
    private readonly IJornadaService      _jornadas;
    private readonly AuthService          _auth;

    public VocalService(LigaManagerContext db, IHttpContextAccessor http, AccesoCampeonato acceso,
                        IJornadaService jornadas, AuthService auth)
    {
        _db = db; _http = http; _acceso = acceso; _jornadas = jornadas; _auth = auth;
    }

    private ClaimsPrincipal? Usuario => _http.HttpContext?.User;
    private int? UsuarioActualId => int.TryParse(Usuario?.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;
    private bool TieneRol(string rol) => string.Equals(Usuario?.FindFirstValue(ClaimTypes.Role), rol, StringComparison.OrdinalIgnoreCase);

    // ── Códigos ──────────────────────────────────────────────────────────────

    private static string NuevoCodigo()
    {
        var c = new char[10];
        for (var i = 0; i < c.Length; i++) c[i] = Alfabeto[RandomNumberGenerator.GetInt32(Alfabeto.Length)];
        return $"{new string(c, 0, 5)}-{new string(c, 5, 5)}";
    }

    // Mayúsculas y sin guiones ni espacios, para que «abcde fghjk» y «ABCDE-FGHJK» sean el mismo.
    private static string Normalizar(string codigo)
        => new string((codigo ?? "").ToUpperInvariant().Where(char.IsLetterOrDigit).ToArray());

    private static string Hash(string codigo)
        => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(Normalizar(codigo)))).ToLowerInvariant();

    private static string Local(DateTime utc) => (utc + TimeSpan.FromHours(-5)).ToString("yyyy-MM-dd HH:mm");
    private static string? Dia(DateOnly? d) => d?.ToString("yyyy-MM-dd");

    // ── Invitaciones: crear ──────────────────────────────────────────────────

    // Organizador: titular o reemplazo. Vocal titular: solo reemplazo de su campeonato.
    public async Task<ServiceResult<InvitacionCreadaDto>> CrearInvitacionAsync(int idCampeonato, CrearInvitacionRequest req)
    {
        if (UsuarioActualId is not int yo) return ServiceResult<InvitacionCreadaDto>.Fail("Sesión no válida.");
        if (!Enum.TryParse<TipoVocal>(req.Tipo, true, out var tipo))
            return ServiceResult<InvitacionCreadaDto>.Fail("Tipo de invitación inválido. Use Titular o Reemplazo.");

        var camp = await _db.Campeonatos.FirstOrDefaultAsync(c => c.IdCampeonato == idCampeonato);
        if (camp is null) return ServiceResult<InvitacionCreadaDto>.Fail("Campeonato no encontrado.");

        var esVocal = TieneRol("Vocal");
        if (esVocal)
        {
            if (tipo != TipoVocal.Reemplazo)
                return ServiceResult<InvitacionCreadaDto>.Fail("Un vocal solo puede invitar a un reemplazo.");
            var esTitular = await _db.CampeonatoVocales.AnyAsync(v => v.IdCampeonato == idCampeonato && v.IdUsuario == yo
                && v.Activo && v.Tipo == TipoVocal.Titular);
            if (!esTitular) return ServiceResult<InvitacionCreadaDto>.Fail("Campeonato no encontrado.");
        }
        else if (!await _acceso.CampeonatoAsync(idCampeonato))
        {
            return ServiceResult<InvitacionCreadaDto>.Fail("Campeonato no encontrado.");
        }

        var hoy = HoraLocal.Hoy;
        if (camp.FechaFin < hoy)
            return ServiceResult<InvitacionCreadaDto>.Fail("El campeonato ya terminó: no se pueden invitar vocales.");

        DateOnly? soloFecha = null;
        DateTime vence;
        if (tipo == TipoVocal.Reemplazo)
        {
            if (!DateOnly.TryParse(req.Fecha, out var dia))
                return ServiceResult<InvitacionCreadaDto>.Fail("Indica el día del reemplazo (yyyy-MM-dd).");
            if (dia < hoy) return ServiceResult<InvitacionCreadaDto>.Fail("El día del reemplazo no puede ser anterior a hoy.");
            if (dia > camp.FechaFin) return ServiceResult<InvitacionCreadaDto>.Fail("El día del reemplazo es posterior al fin del campeonato.");
            soloFecha = dia;
            vence = HoraLocal.FinDelDiaUtc(dia);
        }
        else
        {
            vence = HoraLocal.FinDelDiaUtc(camp.FechaFin);
        }

        var codigo = NuevoCodigo();
        var inv = new InvitacionVocal
        {
            IdCampeonato = idCampeonato,
            Tipo         = tipo,
            SoloFecha    = soloFecha,
            TokenHash    = Hash(codigo),
            CreadaPor    = yo,
            CreatedAt    = DateTime.UtcNow,
            VenceEn      = vence,
        };
        _db.InvitacionesVocal.Add(inv);
        await _db.SaveChangesAsync();

        return ServiceResult<InvitacionCreadaDto>.Ok(new InvitacionCreadaDto(
            inv.IdInvitacion, codigo, tipo.ToString(), Dia(soloFecha), Local(vence)));
    }

    // ── Invitaciones y vocales del campeonato (organizador) ──────────────────

    public async Task<ServiceResult<VocalesCampeonatoDto>> ListarAsync(int idCampeonato)
    {
        if (!await _acceso.CampeonatoAsync(idCampeonato)) return ServiceResult<VocalesCampeonatoDto>.Fail("Campeonato no encontrado.");
        var hoy = HoraLocal.Hoy;
        var ahora = DateTime.UtcNow;

        var vocales = await _db.CampeonatoVocales
            .Where(v => v.IdCampeonato == idCampeonato && v.Activo
                && (v.Tipo == TipoVocal.Titular || v.SoloFecha >= hoy))
            .OrderBy(v => v.Tipo).ThenBy(v => v.SoloFecha)
            .Select(v => new { v.IdUsuario, v.Usuario.Nombre, v.Usuario.Email, v.Tipo, v.SoloFecha })
            .ToListAsync();

        var invitaciones = await _db.InvitacionesVocal
            .Where(i => i.IdCampeonato == idCampeonato && !i.Revocada && i.UsadaPor == null && i.VenceEn > ahora)
            .OrderByDescending(i => i.CreatedAt)
            .Select(i => new { i.IdInvitacion, i.Tipo, i.SoloFecha, i.VenceEn, Creador = i.Creador.Nombre })
            .ToListAsync();

        return ServiceResult<VocalesCampeonatoDto>.Ok(new VocalesCampeonatoDto(
            vocales.Select(v => new VocalDelCampeonatoDto(v.IdUsuario, v.Nombre, v.Email, v.Tipo.ToString(), Dia(v.SoloFecha))).ToList(),
            invitaciones.Select(i => new InvitacionPendienteDto(i.IdInvitacion, i.Tipo.ToString(), Dia(i.SoloFecha), Local(i.VenceEn), i.Creador)).ToList()));
    }

    public async Task<ServiceResult> RevocarInvitacionAsync(int idCampeonato, int idInvitacion)
    {
        if (!await _acceso.CampeonatoAsync(idCampeonato)) return ServiceResult.Fail("Campeonato no encontrado.");
        var inv = await _db.InvitacionesVocal.FirstOrDefaultAsync(i => i.IdInvitacion == idInvitacion && i.IdCampeonato == idCampeonato);
        if (inv is null) return ServiceResult.Fail("Invitación no encontrada.");
        inv.Revocada = true;
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    // Quita al vocal del campeonato (titular y reemplazos). Sus registros anteriores se conservan.
    public async Task<ServiceResult> QuitarVocalAsync(int idCampeonato, int idUsuario)
    {
        if (!await _acceso.CampeonatoAsync(idCampeonato)) return ServiceResult.Fail("Campeonato no encontrado.");
        var habilitaciones = await _db.CampeonatoVocales
            .Where(v => v.IdCampeonato == idCampeonato && v.IdUsuario == idUsuario && v.Activo).ToListAsync();
        if (habilitaciones.Count == 0) return ServiceResult.Fail("Ese vocal no está habilitado en el campeonato.");
        habilitaciones.ForEach(v => v.Activo = false);
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    // ── Invitaciones: consultar y aceptar (sin sesión o con sesión de vocal) ──

    private async Task<(InvitacionVocal? inv, string? motivo)> BuscarVigenteAsync(string codigo)
    {
        var hash = Hash(codigo);
        var inv = await _db.InvitacionesVocal
            .Include(i => i.Campeonato).Include(i => i.Creador)
            .FirstOrDefaultAsync(i => i.TokenHash == hash);
        if (inv is null) return (null, "El código no es válido.");
        if (inv.Revocada) return (inv, "Esta invitación fue anulada por el organizador.");
        if (inv.UsadaPor != null) return (inv, "Esta invitación ya se usó.");
        if (inv.VenceEn <= DateTime.UtcNow) return (inv, "Esta invitación venció.");
        return (inv, null);
    }

    public async Task<ServiceResult<InfoInvitacionDto>> ConsultarAsync(string codigo)
    {
        var (inv, motivo) = await BuscarVigenteAsync(codigo);
        if (inv is null) return ServiceResult<InfoInvitacionDto>.Fail(motivo!);
        var organizador = await _db.Usuarios.Where(u => u.IdUsuario == inv.Campeonato.IdUsuarioCreador)
            .Select(u => u.Nombre).FirstOrDefaultAsync() ?? inv.Creador.Nombre;
        return ServiceResult<InfoInvitacionDto>.Ok(new InfoInvitacionDto(
            inv.Campeonato.Nombre, organizador, inv.Tipo.ToString(), Dia(inv.SoloFecha), Local(inv.VenceEn), motivo is null, motivo));
    }

    public async Task<ServiceResult<LoginResponse>> AceptarAsync(string codigo, AceptarInvitacionRequest req)
    {
        var (inv, motivo) = await BuscarVigenteAsync(codigo);
        if (inv is null || motivo is not null) return ServiceResult<LoginResponse>.Fail(motivo!);

        Usuario? usuario;
        if (UsuarioActualId is int yo)
        {
            // Con sesión iniciada: solo una cuenta de vocal puede aceptar.
            usuario = await _db.Usuarios.FirstOrDefaultAsync(u => u.IdUsuario == yo && u.Activo);
            if (usuario is null) return ServiceResult<LoginResponse>.Fail("Sesión no válida.");
            if (usuario.Rol != RolUsuario.Vocal)
                return ServiceResult<LoginResponse>.Fail("Esta invitación es para una cuenta de vocal. Cierra sesión y entra con otra cuenta, o crea una nueva.");
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
                if (usuario.Rol != RolUsuario.Vocal)
                    return ServiceResult<LoginResponse>.Fail("Ese email ya pertenece a una cuenta de organizador. Usa otro email para la cuenta de vocal.");
            }
            else
            {
                var nombre = req.Nombre?.Trim() ?? "";
                if (nombre.Length == 0) return ServiceResult<LoginResponse>.Fail("Escribe tu nombre para crear la cuenta.");
                if (nombre.Length > 100 || email.Length > 150) return ServiceResult<LoginResponse>.Fail("Nombre o email demasiado largos.");
                if (!System.Text.RegularExpressions.Regex.IsMatch(email, @"^[^@\s]+@[^@\s]+\.[^@\s]+$"))
                    return ServiceResult<LoginResponse>.Fail("El email no es válido.");
                if (password.Length < 6) return ServiceResult<LoginResponse>.Fail("La contraseña debe tener al menos 6 caracteres.");
                usuario = new Usuario
                {
                    Nombre = nombre, Email = email, PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
                    Rol = RolUsuario.Vocal, Activo = true, CreatedAt = DateTime.UtcNow,
                };
                _db.Usuarios.Add(usuario);
                await _db.SaveChangesAsync();
            }
        }

        // Habilitación: no se duplica si ya existe una igual y activa.
        var existe = await _db.CampeonatoVocales.AnyAsync(v => v.IdCampeonato == inv.IdCampeonato && v.IdUsuario == usuario.IdUsuario
            && v.Activo && v.Tipo == inv.Tipo && v.SoloFecha == inv.SoloFecha);
        if (!existe)
        {
            _db.CampeonatoVocales.Add(new CampeonatoVocal
            {
                IdCampeonato = inv.IdCampeonato, IdUsuario = usuario.IdUsuario, Tipo = inv.Tipo,
                SoloFecha = inv.SoloFecha, Activo = true, CreadoPor = inv.CreadaPor, CreatedAt = DateTime.UtcNow,
            });
        }
        inv.UsadaPor = usuario.IdUsuario;
        inv.UsadaEn  = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return ServiceResult<LoginResponse>.Ok(_auth.GenerarRespuesta(usuario));
    }

    // ── Inicio del vocal ─────────────────────────────────────────────────────

    public async Task<VocalInicioDto> InicioAsync()
    {
        var yo  = UsuarioActualId ?? 0;
        var hoy = HoraLocal.Hoy;

        var habilitaciones = await _db.CampeonatoVocales
            .Where(v => v.IdUsuario == yo && v.Activo
                && ((v.Tipo == TipoVocal.Titular && v.Campeonato.FechaFin >= hoy)
                    || (v.Tipo == TipoVocal.Reemplazo && v.SoloFecha >= hoy)))
            .Select(v => new { v.IdCampeonato, v.Campeonato.Nombre, v.Tipo, v.SoloFecha, v.Campeonato.FechaFin })
            .ToListAsync();

        var hoyIds  = await _acceso.CampeonatosDelVocalHoyAsync(yo);
        var titular = habilitaciones.Where(h => h.Tipo == TipoVocal.Titular).Select(h => h.IdCampeonato).Distinct().ToList();
        var reemplazosFuturos = habilitaciones.Where(h => h.Tipo == TipoVocal.Reemplazo && h.SoloFecha > hoy).ToList();

        var inicio = hoy.ToDateTime(TimeOnly.MinValue);
        var manana = inicio.AddDays(1);

        var partidosHoy = await ConsultaPartidos(_db.Partidos
                .Where(p => hoyIds.Contains(p.Jornada.IdCampeonato) && p.Fecha >= inicio && p.Fecha < manana), true)
            .ToListAsync();

        // Próximos (solo para mirar): los de sus campeonatos como titular y los días de reemplazo ya asignados.
        var idsReemplazo = reemplazosFuturos.Select(r => r.IdCampeonato).Distinct().ToList();
        var candidatos = await ConsultaPartidos(_db.Partidos
                .Where(p => p.Fecha >= manana && (titular.Contains(p.Jornada.IdCampeonato) || idsReemplazo.Contains(p.Jornada.IdCampeonato))), false)
            .Take(40)
            .ToListAsync();
        var proximos = candidatos
            .Where(p => titular.Contains(p.IdCampeonato)
                || reemplazosFuturos.Any(r => r.IdCampeonato == p.IdCampeonato && r.SoloFecha!.Value.ToString("yyyy-MM-dd") == p.Fecha[..10]))
            .Take(10)
            .ToList();

        return new VocalInicioDto(
            hoy.ToString("yyyy-MM-dd"),
            partidosHoy,
            proximos,
            habilitaciones
                .OrderBy(h => h.Nombre)
                .Select(h => new VocalCampeonatoDto(h.IdCampeonato, h.Nombre, h.Tipo.ToString(), Dia(h.SoloFecha), h.FechaFin.ToString("yyyy-MM-dd")))
                .ToList());
    }

    private static IQueryable<VocalPartidoDto> ConsultaPartidos(IQueryable<Partido> q, bool esHoy)
        => q.OrderBy(p => p.Fecha)
            .Select(p => new VocalPartidoDto(
                p.IdPartido, p.IdJornada, p.Jornada.IdCampeonato, p.Jornada.Campeonato.Nombre,
                "Jornada " + p.Jornada.Numero,
                p.EquipoLocal.Nombre, p.EquipoVisitante.Nombre,
                p.Fecha.ToString("yyyy-MM-dd HH:mm"),
                p.Estadio != null ? p.Estadio.Nombre : null,
                p.Jugado, esHoy));

    // ── Partido del vocal ────────────────────────────────────────────────────

    public async Task<ServiceResult<VocalPartidoDetalleDto>> PartidoAsync(int idPartido)
    {
        var detalle = await _jornadas.GetPartidoAsync(idPartido);   // comprueba el acceso de vocal (hoy y habilitado)
        if (!detalle.Success) return ServiceResult<VocalPartidoDetalleDto>.Fail("Este partido no está disponible para registrar hoy.");
        var p = detalle.Data!;

        var camp = await _db.Partidos.Where(x => x.IdPartido == idPartido)
            .Select(x => new { x.Jornada.IdCampeonato, x.Jornada.Campeonato.Nombre, x.Fecha }).FirstAsync();
        var fecha = DateOnly.FromDateTime(camp.Fecha);

        return ServiceResult<VocalPartidoDetalleDto>.Ok(new VocalPartidoDetalleDto(
            camp.IdCampeonato, camp.Nombre, p,
            await PlantelAsync(p.IdEquipoLocal, fecha),
            await PlantelAsync(p.IdEquipoVisitante, fecha)));
    }

    // Jugadores habilitados en el equipo el día del partido (mismo criterio que GET /api/equipos/{id}?fecha=).
    private async Task<EquipoDetalleDto> PlantelAsync(int idEquipo, DateOnly fecha)
    {
        var e = await _db.Equipos.Include(x => x.Pais).FirstAsync(x => x.IdEquipo == idEquipo);
        var jugadores = await _db.JugadorEquipos
            .Where(je => je.IdEquipo == idEquipo && je.FechaDesde <= fecha && (je.FechaHasta == null || je.FechaHasta >= fecha))
            .Select(je => new { je.IdJugador, je.Jugador.Persona.Nombre, je.Jugador.Persona.Apellido, je.FechaDesde, je.FechaHasta,
                                je.Dorsal, je.Jugador.Persona.Cedula, je.Posicion, je.Jugador.Persona.FechaNac, je.Jugador.Persona.FotoUrl })
            .ToListAsync();
        return new EquipoDetalleDto(e.IdEquipo, e.Nombre, e.IdPais, e.Pais.Nombre,
            jugadores.Select(j => new JugadorEnEquipoDto(
                j.IdJugador, j.Nombre, j.Apellido, j.FechaDesde.ToString("yyyy-MM-dd"), j.FechaHasta?.ToString("yyyy-MM-dd"),
                j.Dorsal, j.Cedula, j.Posicion, Edad(j.FechaNac), j.FotoUrl)).ToList());
    }

    private static int Edad(DateOnly nacimiento)
    {
        var hoy = HoraLocal.Hoy;
        var edad = hoy.Year - nacimiento.Year;
        if (nacimiento > hoy.AddYears(-edad)) edad--;
        return edad;
    }

    // Cierra el partido: observaciones, quién y cuándo (Fase 8), y lo marca como jugado.
    public async Task<ServiceResult<PartidoDetalleDto>> CerrarAsync(int idPartido, CerrarPartidoVocalRequest req)
    {
        if (!await _acceso.PartidoAsync(idPartido)) return ServiceResult<PartidoDetalleDto>.Fail("Este partido no está disponible para registrar hoy.");
        return await _jornadas.CerrarRegistroAsync(idPartido, new CerrarRegistroRequest(req.Observaciones));
    }

    // ── Bloqueo después del cierre (Fase 8) ──────────────────────────────────

    public Task<bool> CerradoAsync(int idPartido)
        => _db.Partidos.AnyAsync(p => p.IdPartido == idPartido && p.EstadoRegistro == EstadoRegistro.Cerrado);

    public Task<int?> PartidoDeEventoAsync(int idEvento)
        => _db.EventosPartido.Where(e => e.IdEvento == idEvento).Select(e => (int?)e.IdPartido).FirstOrDefaultAsync();
    public Task<int?> PartidoDeCambioAsync(int idCambio)
        => _db.CambiosPartido.Where(c => c.IdCambio == idCambio).Select(c => (int?)c.IdPartido).FirstOrDefaultAsync();
    public Task<int?> PartidoDeAlineacionAsync(int idAlineacion)
        => _db.Alineaciones.Where(a => a.IdAlineacion == idAlineacion).Select(a => (int?)a.IdPartido).FirstOrDefaultAsync();
}
