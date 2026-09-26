namespace LigaManager.Infrastructure.Services;
using LigaManager.Infrastructure.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

// Comprueba que el usuario actual puede operar sobre un campeonato (y sus jornadas,
// partidos, grupos, etc.): el Admin accede a todo; el organizador solo a los suyos.
public class AccesoCampeonato
{
    private readonly LigaManagerContext _db;
    private readonly IHttpContextAccessor _http;
    public AccesoCampeonato(LigaManagerContext db, IHttpContextAccessor http) { _db = db; _http = http; }

    private bool EsAdmin => string.Equals(
        _http.HttpContext?.User.FindFirstValue(ClaimTypes.Role), "Admin", StringComparison.OrdinalIgnoreCase);

    private int? UsuarioId => int.TryParse(
        _http.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    public async Task<bool> CampeonatoAsync(int idCampeonato)
        => EsAdmin || (UsuarioId is int u
            && await _db.Campeonatos.AnyAsync(c => c.IdCampeonato == idCampeonato && c.IdUsuarioCreador == u));

    public async Task<bool> JornadaAsync(int idJornada)
        => EsAdmin || (UsuarioId is int u
            && await _db.Jornadas.AnyAsync(j => j.IdJornada == idJornada && j.Campeonato.IdUsuarioCreador == u));

    public async Task<bool> PartidoAsync(int idPartido)
        => EsAdmin || (UsuarioId is int u
            && await _db.Partidos.AnyAsync(p => p.IdPartido == idPartido && p.Jornada.Campeonato.IdUsuarioCreador == u));

    public async Task<bool> EventoAsync(int idEvento)
        => EsAdmin || (UsuarioId is int u
            && await _db.EventosPartido.AnyAsync(e => e.IdEvento == idEvento && e.Partido.Jornada.Campeonato.IdUsuarioCreador == u));

    public async Task<bool> AlineacionAsync(int idAlineacion)
        => EsAdmin || (UsuarioId is int u
            && await _db.Alineaciones.AnyAsync(a => a.IdAlineacion == idAlineacion && a.Partido.Jornada.Campeonato.IdUsuarioCreador == u));

    public async Task<bool> CambioAsync(int idCambio)
        => EsAdmin || (UsuarioId is int u
            && await _db.CambiosPartido.AnyAsync(c => c.IdCambio == idCambio && c.Partido.Jornada.Campeonato.IdUsuarioCreador == u));

    public async Task<bool> GrupoAsync(int idGrupo)
        => EsAdmin || (UsuarioId is int u
            && await _db.Grupos.AnyAsync(g => g.IdGrupo == idGrupo && g.Campeonato.IdUsuarioCreador == u));

    public async Task<bool> FaseAsync(int idFase)
        => EsAdmin || (UsuarioId is int u
            && await _db.FasesCampeonato.AnyAsync(f => f.IdFase == idFase && f.Campeonato.IdUsuarioCreador == u));
}
