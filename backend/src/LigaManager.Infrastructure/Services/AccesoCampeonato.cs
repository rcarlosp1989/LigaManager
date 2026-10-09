namespace LigaManager.Infrastructure.Services;
using LigaManager.Infrastructure.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

// Comprueba que el usuario actual puede operar sobre un campeonato (y sus jornadas,
// partidos, grupos, etc.): el Admin accede a todo; el organizador solo a los suyos.
//
// Vocal (Fase 7): solo llega aquí desde /api/vocal (el resto de los controladores lo
// rechaza por política). Puede operar sobre un partido únicamente si está habilitado en
// su campeonato y el partido es hoy (hora de Ecuador).
public class AccesoCampeonato
{
    private readonly LigaManagerContext _db;
    private readonly IHttpContextAccessor _http;
    public AccesoCampeonato(LigaManagerContext db, IHttpContextAccessor http) { _db = db; _http = http; }

    private bool EsAdmin => string.Equals(
        _http.HttpContext?.User.FindFirstValue(ClaimTypes.Role), "Admin", StringComparison.OrdinalIgnoreCase);

    private int? UsuarioId => int.TryParse(
        _http.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    private bool EsVocal => string.Equals(
        _http.HttpContext?.User.FindFirstValue(ClaimTypes.Role), "Vocal", StringComparison.OrdinalIgnoreCase);

    // Campeonatos en los que el vocal puede registrar hoy.
    public async Task<List<int>> CampeonatosDelVocalHoyAsync(int idUsuario)
    {
        var hoy = HoraLocal.Hoy;
        return await _db.CampeonatoVocales
            .Where(v => v.IdUsuario == idUsuario && v.Activo
                && ((v.Tipo == Domain.Entities.TipoVocal.Titular && v.Campeonato.FechaFin >= hoy)
                    || (v.Tipo == Domain.Entities.TipoVocal.Reemplazo && v.SoloFecha == hoy)))
            .Select(v => v.IdCampeonato)
            .Distinct()
            .ToListAsync();
    }

    // El partido es hoy y el vocal está habilitado hoy en su campeonato.
    public async Task<bool> VocalPuedePartidoAsync(int idUsuario, int idPartido)
    {
        var campeonatos = await CampeonatosDelVocalHoyAsync(idUsuario);
        if (campeonatos.Count == 0) return false;
        var inicio = HoraLocal.Hoy.ToDateTime(TimeOnly.MinValue);
        var fin    = inicio.AddDays(1);
        return await _db.Partidos.AnyAsync(p => p.IdPartido == idPartido
            && campeonatos.Contains(p.Jornada.IdCampeonato)
            && p.Fecha >= inicio && p.Fecha < fin);
    }

    private async Task<bool> VocalPuedePartidoAsync(int? idPartido)
        => idPartido is int p && UsuarioId is int u && await VocalPuedePartidoAsync(u, p);

    public async Task<bool> CampeonatoAsync(int idCampeonato)
        => !EsVocal && (EsAdmin || (UsuarioId is int u
            && await _db.Campeonatos.AnyAsync(c => c.IdCampeonato == idCampeonato && c.IdUsuarioCreador == u)));

    public async Task<bool> JornadaAsync(int idJornada)
        => !EsVocal && (EsAdmin || (UsuarioId is int u
            && await _db.Jornadas.AnyAsync(j => j.IdJornada == idJornada && j.Campeonato.IdUsuarioCreador == u)));

    public async Task<bool> PartidoAsync(int idPartido)
        => EsVocal ? await VocalPuedePartidoAsync(idPartido) : EsAdmin || (UsuarioId is int u
            && await _db.Partidos.AnyAsync(p => p.IdPartido == idPartido && p.Jornada.Campeonato.IdUsuarioCreador == u));

    public async Task<bool> EventoAsync(int idEvento)
        => EsVocal ? await VocalPuedePartidoAsync(await _db.EventosPartido.Where(e => e.IdEvento == idEvento).Select(e => (int?)e.IdPartido).FirstOrDefaultAsync())
        : EsAdmin || (UsuarioId is int u
            && await _db.EventosPartido.AnyAsync(e => e.IdEvento == idEvento && e.Partido.Jornada.Campeonato.IdUsuarioCreador == u));

    public async Task<bool> AlineacionAsync(int idAlineacion)
        => EsVocal ? await VocalPuedePartidoAsync(await _db.Alineaciones.Where(a => a.IdAlineacion == idAlineacion).Select(a => (int?)a.IdPartido).FirstOrDefaultAsync())
        : EsAdmin || (UsuarioId is int u
            && await _db.Alineaciones.AnyAsync(a => a.IdAlineacion == idAlineacion && a.Partido.Jornada.Campeonato.IdUsuarioCreador == u));

    public async Task<bool> CambioAsync(int idCambio)
        => EsVocal ? await VocalPuedePartidoAsync(await _db.CambiosPartido.Where(c => c.IdCambio == idCambio).Select(c => (int?)c.IdPartido).FirstOrDefaultAsync())
        : EsAdmin || (UsuarioId is int u
            && await _db.CambiosPartido.AnyAsync(c => c.IdCambio == idCambio && c.Partido.Jornada.Campeonato.IdUsuarioCreador == u));

    public async Task<bool> GrupoAsync(int idGrupo)
        => !EsVocal && (EsAdmin || (UsuarioId is int u
            && await _db.Grupos.AnyAsync(g => g.IdGrupo == idGrupo && g.Campeonato.IdUsuarioCreador == u)));

    public async Task<bool> FaseAsync(int idFase)
        => !EsVocal && (EsAdmin || (UsuarioId is int u
            && await _db.FasesCampeonato.AnyAsync(f => f.IdFase == idFase && f.Campeonato.IdUsuarioCreador == u)));
}
