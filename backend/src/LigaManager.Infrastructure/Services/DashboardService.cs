namespace LigaManager.Infrastructure.Services;
using LigaManager.Application.DTOs.Dashboard;
using LigaManager.Infrastructure.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

public class DashboardService
{
    private readonly LigaManagerContext _db;
    private readonly IHttpContextAccessor _http;
    public DashboardService(LigaManagerContext db, IHttpContextAccessor http) { _db = db; _http = http; }

    private bool EsAdmin => string.Equals(
        _http.HttpContext?.User.FindFirstValue(ClaimTypes.Role), "Admin", StringComparison.OrdinalIgnoreCase);
    private int? UsuarioActualId => int.TryParse(
        _http.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    public async Task<DashboardDto> GetDashboardAsync()
    {
        // Cada organizador ve solo lo suyo (antes se contaba toda la base). El Admin ve todo.
        var u = UsuarioActualId;
        var campeonatos = EsAdmin ? _db.Campeonatos : _db.Campeonatos.Where(c => c.IdUsuarioCreador == u);
        var equipos     = EsAdmin ? _db.Equipos     : _db.Equipos.Where(e => e.IdUsuarioCreador == u);
        var jugadores   = EsAdmin ? _db.Jugadores   : _db.Jugadores.Where(j => j.JugadorEquipos.Any(je => je.Equipo.IdUsuarioCreador == u));
        var partidosVisibles = EsAdmin ? _db.Partidos : _db.Partidos.Where(p => p.Jornada.Campeonato.IdUsuarioCreador == u);

        // ── Totales ──────────────────────────────────────────────────────────
        var totalCampeonatos   = await campeonatos.CountAsync();
        var campeonatosEnCurso = await campeonatos.CountAsync(c => c.Estado == Domain.Entities.EstadoCampeonato.EnCurso);
        var totalEquipos       = await equipos.CountAsync();
        var totalJugadores     = await jugadores.CountAsync();

        // ── Próximos partidos (no jugados, fecha >= hoy, top 5) ──────────────
        var proximos = await partidosVisibles
            .Where(p => !p.Jugado && p.Fecha >= DateTime.Today)
            .Include(p => p.EquipoLocal)
            .Include(p => p.EquipoVisitante)
            .Include(p => p.Estadio)
            .Include(p => p.Jornada).ThenInclude(j => j.Campeonato)
            .OrderBy(p => p.Fecha)
            .Take(5)
            .Select(p => new ProximoPartidoDto(
                p.IdPartido,
                p.Jornada.IdCampeonato,
                p.Jornada.Campeonato.Nombre,
                $"Jornada {p.Jornada.Numero}",
                p.EquipoLocal.Nombre,
                p.EquipoVisitante.Nombre,
                p.Fecha.ToString("yyyy-MM-dd HH:mm"),
                p.Estadio.Nombre,
                p.IdJornada
            ))
            .ToListAsync();

        // ── Últimos resultados (jugados, top 5 más recientes) ─────────────────
        var partidos = await partidosVisibles
            .Where(p => p.Jugado)
            .Include(p => p.EquipoLocal)
            .Include(p => p.EquipoVisitante)
            .Include(p => p.Jornada).ThenInclude(j => j.Campeonato)
            .Include(p => p.Eventos)
            .OrderByDescending(p => p.Fecha)
            .Take(5)
            .ToListAsync();

        // Calcular goles: necesitamos saber qué jugadores pertenecen a cada equipo
        // Cargamos los jugador_equipo de los partidos relevantes
        var idPartidos   = partidos.Select(p => p.IdPartido).ToList();
        var idEquipos    = partidos.SelectMany(p => new[] { p.IdEquipoLocal, p.IdEquipoVisitante }).Distinct().ToList();
        var jugadorEquipos = await _db.JugadorEquipos
            .Where(je => idEquipos.Contains(je.IdEquipo))
            .ToListAsync();

        var ultimosResultados = partidos.Select(p =>
        {
            var jugadoresLocal     = jugadorEquipos.Where(je => je.IdEquipo == p.IdEquipoLocal).Select(je => je.IdJugador).ToHashSet();
            var jugadoresVisitante = jugadorEquipos.Where(je => je.IdEquipo == p.IdEquipoVisitante).Select(je => je.IdJugador).ToHashSet();

            // El marcador guardado es la fuente (incluye el 3-0 por reglamento); si falta, se cuenta desde los eventos.
            // Un gol en contra suma al equipo contrario del jugador.
            var golesLocal = p.GolesLocal ?? p.Eventos.Count(e =>
                (e.TipoEvento == "GOL" && jugadoresLocal.Contains(e.IdJugador))
                || (e.TipoEvento == "GOL_EN_CONTRA" && jugadoresVisitante.Contains(e.IdJugador)));
            var golesVisitante = p.GolesVisitante ?? p.Eventos.Count(e =>
                (e.TipoEvento == "GOL" && jugadoresVisitante.Contains(e.IdJugador))
                || (e.TipoEvento == "GOL_EN_CONTRA" && jugadoresLocal.Contains(e.IdJugador)));

            return new UltimoResultadoDto(
                p.IdPartido,
                p.Jornada.IdCampeonato,
                p.Jornada.Campeonato.Nombre,
                $"Jornada {p.Jornada.Numero}",
                p.EquipoLocal.Nombre,
                golesLocal,
                p.EquipoVisitante.Nombre,
                golesVisitante,
                p.Fecha.ToString("yyyy-MM-dd"),
                p.IdJornada
            );
        }).ToList();

        return new DashboardDto(
            totalCampeonatos,
            campeonatosEnCurso,
            totalEquipos,
            totalJugadores,
            proximos,
            ultimosResultados
        );
    }
}
