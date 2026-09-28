namespace LigaManager.Infrastructure.Services;
using LigaManager.Application.DTOs.Dashboard;
using LigaManager.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

public class DashboardService
{
    private readonly LigaManagerContext _db;
    public DashboardService(LigaManagerContext db) => _db = db;

    public async Task<DashboardDto> GetDashboardAsync()
    {
        // ── Totales ──────────────────────────────────────────────────────────
        var totalCampeonatos   = await _db.Campeonatos.CountAsync();
        var campeonatosEnCurso = await _db.Campeonatos.CountAsync(c => c.Estado == Domain.Entities.EstadoCampeonato.EnCurso);
        var totalEquipos       = await _db.Equipos.CountAsync();
        var totalJugadores     = await _db.Jugadores.CountAsync();

        // ── Próximos partidos (no jugados, fecha >= hoy, top 5) ──────────────
        var proximos = await _db.Partidos
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
                p.Estadio.Nombre
            ))
            .ToListAsync();

        // ── Últimos resultados (jugados, top 5 más recientes) ─────────────────
        var partidos = await _db.Partidos
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
                p.Fecha.ToString("yyyy-MM-dd")
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
