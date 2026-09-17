namespace LigaManager.Infrastructure.Services;
using LigaManager.Application.DTOs.Jornadas;
using LigaManager.Application.DTOs.Partidos;
using LigaManager.Application.Common;
using LigaManager.Application.Interfaces;
using LigaManager.Domain.Entities;
using LigaManager.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;

public class JornadaService : IJornadaService
{
    private readonly LigaManagerContext _db;
    private readonly IHttpContextAccessor _http;
    public JornadaService(LigaManagerContext db, IHttpContextAccessor http) { _db = db; _http = http; }
    private int? UsuarioActualId => int.TryParse(_http.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    // ── Helpers de proyección ────────────────────────────────────────────────

    private static PartidoDetalleDto ToPartidoDetalleDto(Partido p, int numero) => new(
        p.IdPartido,
        p.IdJornada,
        numero,
        p.EquipoLocal.Nombre,
        p.IdEquipoLocal,
        p.EquipoVisitante.Nombre,
        p.IdEquipoVisitante,
        p.Fecha.ToString("yyyy-MM-dd"),
        p.Jugado,
        p.GolesLocal,
        p.GolesVisitante,
        ResolverEstado(p),
        p.Estadio?.Nombre,
        p.Arbitro != null ? $"{p.Arbitro.Persona.Nombre} {p.Arbitro.Persona.Apellido}" : null,
        p.Oficiales.Select(o => new DesignacionPartidoDto(
            o.IdCargo,
            o.Cargo.Nombre,
            o.IdArbitro,
            $"{o.Arbitro.Persona.Nombre} {o.Arbitro.Persona.Apellido}"
        )).ToList(),
        p.Eventos.Select(e => new EventoPartidoDto(
            e.IdEvento,
            e.TipoEvento,
            $"{e.Jugador.Persona.Nombre} {e.Jugador.Persona.Apellido}",
            e.IdJugador,
            e.Minuto
        )).ToList()
    );

    private static string ResolverEstado(Partido p)
    {
        if (p.Jugado)                    return "Finalizado";
        if (p.Fecha < DateTime.Today)    return "Pendiente";
        return "Programado";
    }

    // ── Jornadas ─────────────────────────────────────────────────────────────

    public async Task<List<JornadaListDto>> GetByCampeonatoAsync(int idCampeonato)
        => await _db.Jornadas
            .Where(j => j.IdCampeonato == idCampeonato)
            .Include(j => j.Instancia)
            .Include(j => j.Grupo)
            .Include(j => j.Partidos)
            .OrderBy(j => j.Numero)
            .Select(j => new JornadaListDto(
                j.IdJornada,
                j.Numero,
                j.IdCampeonato,
                j.Instancia.Nombre,
                j.Grupo != null ? j.Grupo.Nombre : null,
                j.Partidos.Count
            ))
            .ToListAsync();

    public async Task<ServiceResult<JornadaDetalleDto>> GetByIdAsync(int id)
    {
        var j = await _db.Jornadas
            .Include(j => j.Instancia)
            .Include(j => j.Grupo)
            .Include(j => j.Partidos).ThenInclude(p => p.EquipoLocal)
            .Include(j => j.Partidos).ThenInclude(p => p.EquipoVisitante)
            .Include(j => j.Partidos).ThenInclude(p => p.Estadio)
            .Include(j => j.Partidos).ThenInclude(p => p.Arbitro).ThenInclude(a => a.Persona)
            .Include(j => j.Partidos).ThenInclude(p => p.Oficiales).ThenInclude(o => o.Cargo)
            .Include(j => j.Partidos).ThenInclude(p => p.Oficiales).ThenInclude(o => o.Arbitro).ThenInclude(a => a.Persona)
            .Include(j => j.Partidos).ThenInclude(p => p.Eventos).ThenInclude(e => e.Jugador).ThenInclude(ju => ju.Persona)
            .FirstOrDefaultAsync(j => j.IdJornada == id);

        if (j is null) return ServiceResult<JornadaDetalleDto>.Fail("Jornada no encontrada.");

        var partidos = j.Partidos
            .OrderBy(p => p.Fecha)
            .Select((p, i) => ToPartidoDetalleDto(p, i + 1))
            .ToList();

        return ServiceResult<JornadaDetalleDto>.Ok(new JornadaDetalleDto(
            j.IdJornada, j.Numero, j.IdCampeonato,
            j.IdInstancia, j.Instancia.Nombre,
            j.IdGrupo, j.Grupo?.Nombre,
            partidos
        ));
    }

    public async Task<ServiceResult<JornadaDetalleDto>> CreateAsync(int idCampeonato, CreateJornadaRequest req)
    {
        var campeonatoExiste = await _db.Campeonatos.AnyAsync(c => c.IdCampeonato == idCampeonato);
        if (!campeonatoExiste)
            return ServiceResult<JornadaDetalleDto>.Fail("Campeonato no encontrado.");

        var instanciaExiste = await _db.CatalogoInstancias.AnyAsync(i => i.IdInstancia == req.IdInstancia);
        if (!instanciaExiste)
            return ServiceResult<JornadaDetalleDto>.Fail("Instancia no válida.");

        var numeroExiste = await _db.Jornadas
            .AnyAsync(j => j.IdCampeonato == idCampeonato && j.Numero == req.Numero);
        if (numeroExiste)
            return ServiceResult<JornadaDetalleDto>.Fail($"Ya existe la jornada {req.Numero} en este campeonato.");

        var jornada = new Jornada
        {
            Numero       = req.Numero,
            IdCampeonato = idCampeonato,
            IdInstancia  = req.IdInstancia,
            IdGrupo      = req.IdGrupo,
        };

        _db.Jornadas.Add(jornada);
        await _db.SaveChangesAsync();
        return await GetByIdAsync(jornada.IdJornada);
    }

    public async Task<ServiceResult> DeleteAsync(int id)
    {
        var j = await _db.Jornadas.Include(j => j.Partidos).FirstOrDefaultAsync(j => j.IdJornada == id);
        if (j is null) return ServiceResult.Fail("Jornada no encontrada.");
        if (j.Partidos.Any()) return ServiceResult.Fail("No se puede eliminar: la jornada tiene partidos registrados.");

        _db.Jornadas.Remove(j);
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    // ── Partidos ─────────────────────────────────────────────────────────────

    public async Task<ServiceResult<PartidoDetalleDto>> AgregarPartidoAsync(int idJornada, CreatePartidoRequest req)
    {
        var jornada = await _db.Jornadas
            .Include(j => j.Campeonato)
            .FirstOrDefaultAsync(j => j.IdJornada == idJornada);
        if (jornada is null) return ServiceResult<PartidoDetalleDto>.Fail("Jornada no encontrada.");

        if (req.IdEquipoLocal == req.IdEquipoVisitante)
            return ServiceResult<PartidoDetalleDto>.Fail("El equipo local y visitante no pueden ser el mismo.");

        if (!DateTime.TryParse(req.Fecha, out var fecha))
            return ServiceResult<PartidoDetalleDto>.Fail("Formato de fecha inválido. Use yyyy-MM-dd.");

        var fechaPartido = DateOnly.FromDateTime(fecha);
        if (fechaPartido < jornada.Campeonato.FechaInicio || fechaPartido > jornada.Campeonato.FechaFin)
            return ServiceResult<PartidoDetalleDto>.Fail(
                $"La fecha del partido debe estar entre {jornada.Campeonato.FechaInicio:dd/MM/yyyy} y {jornada.Campeonato.FechaFin:dd/MM/yyyy}.");

        var inscritos = await _db.CampeonatoEquipos
            .Where(ce => ce.IdCampeonato == jornada.IdCampeonato)
            .Select(ce => ce.IdEquipo)
            .ToListAsync();

        if (!inscritos.Contains(req.IdEquipoLocal))
            return ServiceResult<PartidoDetalleDto>.Fail("El equipo local no está inscrito en este campeonato.");
        if (!inscritos.Contains(req.IdEquipoVisitante))
            return ServiceResult<PartidoDetalleDto>.Fail("El equipo visitante no está inscrito en este campeonato.");

        if (jornada.IdGrupo.HasValue)
        {
            var equiposDelGrupo = await _db.GrupoEquipos
                .Where(ge => ge.IdGrupo == jornada.IdGrupo.Value)
                .Select(ge => ge.IdEquipo)
                .ToListAsync();

            if (!equiposDelGrupo.Contains(req.IdEquipoLocal) || !equiposDelGrupo.Contains(req.IdEquipoVisitante))
                return ServiceResult<PartidoDetalleDto>.Fail(
                    "Los dos equipos del partido deben pertenecer al grupo asignado a la jornada.");
        }

        if (req.IdArbitro.HasValue)
        {
            var arbitroExiste = await _db.Arbitros.AnyAsync(a => a.IdArbitro == req.IdArbitro && a.IdUsuarioCreador == UsuarioActualId);
            if (!arbitroExiste) return ServiceResult<PartidoDetalleDto>.Fail("Árbitro no encontrado.");
        }

        if (req.IdEstadio.HasValue)
        {
            var estadioExiste = await _db.Estadios.AnyAsync(e => e.IdEstadio == req.IdEstadio && e.IdUsuarioCreador == UsuarioActualId);
            if (!estadioExiste) return ServiceResult<PartidoDetalleDto>.Fail("Estadio no encontrado.");
        }

        var designaciones = await ValidarDesignacionesAsync(req.Oficiales, jornada.Campeonato.IdModalidad);
        if (!designaciones.Success)
            return ServiceResult<PartidoDetalleDto>.Fail(designaciones.Error!);

        var partido = new Partido
        {
            IdJornada         = idJornada,
            IdEquipoLocal     = req.IdEquipoLocal,
            IdEquipoVisitante = req.IdEquipoVisitante,
            Fecha             = fecha,
            IdEstadio         = req.IdEstadio,
            IdArbitro         = req.IdArbitro,
            Jugado            = false,
        };

        _db.Partidos.Add(partido);
        await _db.SaveChangesAsync();
        if (req.Oficiales is not null)
        {
            _db.PartidosOficiales.AddRange(req.Oficiales.Select(o => new PartidoOficial
            {
                IdPartido = partido.IdPartido,
                IdCargo = o.IdCargo,
                IdArbitro = o.IdArbitro
            }));
            await _db.SaveChangesAsync();
        }
        return await GetPartidoDetalleAsync(partido.IdPartido);
    }

    public async Task<ServiceResult<PartidoDetalleDto>> EditarPartidoAsync(int idPartido, EditarPartidoRequest req)
    {
        var p = await _db.Partidos
            .Include(p => p.Eventos)
            .Include(p => p.Jornada)
            .FirstOrDefaultAsync(p => p.IdPartido == idPartido);
        if (p is null) return ServiceResult<PartidoDetalleDto>.Fail("Partido no encontrado.");

        if (!DateTime.TryParse(req.Fecha, out var fecha))
            return ServiceResult<PartidoDetalleDto>.Fail("Formato de fecha inválido.");

        if (req.IdArbitro.HasValue)
        {
            var arbitroExiste = await _db.Arbitros.AnyAsync(a => a.IdArbitro == req.IdArbitro && a.IdUsuarioCreador == UsuarioActualId);
            if (!arbitroExiste) return ServiceResult<PartidoDetalleDto>.Fail("Árbitro no encontrado.");
        }

        if (req.IdEstadio.HasValue)
        {
            var estadioExiste = await _db.Estadios.AnyAsync(e => e.IdEstadio == req.IdEstadio && e.IdUsuarioCreador == UsuarioActualId);
            if (!estadioExiste) return ServiceResult<PartidoDetalleDto>.Fail("Estadio no encontrado.");
        }

        // Cambio de equipos solo si no hay eventos
        if (req.IdEquipoLocal.HasValue || req.IdEquipoVisitante.HasValue)
        {
            if (p.Eventos.Any())
                return ServiceResult<PartidoDetalleDto>.Fail("No se pueden cambiar los equipos: el partido ya tiene eventos registrados.");

            if (req.IdEquipoLocal.HasValue)
                p.IdEquipoLocal = req.IdEquipoLocal.Value;

            if (req.IdEquipoVisitante.HasValue)
                p.IdEquipoVisitante = req.IdEquipoVisitante.Value;

            if (p.IdEquipoLocal == p.IdEquipoVisitante)
                return ServiceResult<PartidoDetalleDto>.Fail("El equipo local y visitante no pueden ser el mismo.");

            if (p.Jornada.IdGrupo.HasValue)
            {
                var equiposDelGrupo = await _db.GrupoEquipos
                    .Where(ge => ge.IdGrupo == p.Jornada.IdGrupo.Value)
                    .Select(ge => ge.IdEquipo)
                    .ToListAsync();

                if (!equiposDelGrupo.Contains(p.IdEquipoLocal) || !equiposDelGrupo.Contains(p.IdEquipoVisitante))
                    return ServiceResult<PartidoDetalleDto>.Fail(
                        "Los dos equipos del partido deben pertenecer al grupo asignado a la jornada.");
            }
        }

        p.Fecha     = fecha;
        p.IdEstadio = req.IdEstadio;
        p.IdArbitro = req.IdArbitro;
        await _db.SaveChangesAsync();
        return await GetPartidoDetalleAsync(idPartido);
    }

    public async Task<ServiceResult<PartidoDetalleDto>> MarcarJugadoAsync(int idPartido, MarcarJugadoRequest req)
    {
        var p = await _db.Partidos.FindAsync(idPartido);
        if (p is null) return ServiceResult<PartidoDetalleDto>.Fail("Partido no encontrado.");

        // Al marcar como jugado, los goles registrados son la fuente del marcador.
        if (req.Jugado)
        {
            // Obtener jugadores de cada equipo en la fecha del partido
            var fecha = DateOnly.FromDateTime(p.Fecha);

            var jugadoresLocal = await _db.JugadorEquipos
                .Where(je => je.IdEquipo == p.IdEquipoLocal
                    && je.FechaDesde <= fecha
                    && (je.FechaHasta == null || je.FechaHasta >= fecha))
                .Select(je => je.IdJugador)
                .ToListAsync();

            var jugadoresVisitante = await _db.JugadorEquipos
                .Where(je => je.IdEquipo == p.IdEquipoVisitante
                    && je.FechaDesde <= fecha
                    && (je.FechaHasta == null || je.FechaHasta >= fecha))
                .Select(je => je.IdJugador)
                .ToListAsync();

            var eventos = await _db.EventosPartido
                .Where(e => e.IdPartido == idPartido && e.TipoEvento == "GOL")
                .ToListAsync();

            p.GolesLocal     = eventos.Count(e => jugadoresLocal.Contains(e.IdJugador));
            p.GolesVisitante = eventos.Count(e => jugadoresVisitante.Contains(e.IdJugador));
        }

        p.Jugado = req.Jugado;
        await _db.SaveChangesAsync();
        await RecalcularPosicionesAsync(p.IdJornada);
        return await GetPartidoDetalleAsync(idPartido);
    }

    public async Task<ServiceResult<PartidoDetalleDto>> RegistrarEventoAsync(int idPartido, RegistrarEventoRequest req)
    {
        var tiposValidos = new[] { "GOL", "TARJETA_AMARILLA", "TARJETA_ROJA" };
        var tipoEvento = req.TipoEvento.Trim().ToUpperInvariant();
        if (!tiposValidos.Contains(tipoEvento))
            return ServiceResult<PartidoDetalleDto>.Fail($"Tipo de evento inválido. Use: {string.Join(", ", tiposValidos)}");

        if (req.Minuto < 1 || req.Minuto > 120)
            return ServiceResult<PartidoDetalleDto>.Fail("El minuto del evento debe estar entre 1 y 120.");

        var partido = await _db.Partidos
            .Include(p => p.Jornada)
                .ThenInclude(j => j.Campeonato)
            .FirstOrDefaultAsync(p => p.IdPartido == idPartido);
        if (partido is null) return ServiceResult<PartidoDetalleDto>.Fail("Partido no encontrado.");

        var fechaPartido = DateOnly.FromDateTime(partido.Fecha);
        var campeonato = partido.Jornada.Campeonato;
        if (fechaPartido < campeonato.FechaInicio || fechaPartido > campeonato.FechaFin)
            return ServiceResult<PartidoDetalleDto>.Fail(
                $"No se pueden registrar eventos: la fecha del partido está fuera del campeonato ({campeonato.FechaInicio:dd/MM/yyyy} - {campeonato.FechaFin:dd/MM/yyyy}).");

        var jugadorExiste = await _db.Jugadores.AnyAsync(j => j.IdJugador == req.IdJugador);
        if (!jugadorExiste) return ServiceResult<PartidoDetalleDto>.Fail("Jugador no encontrado.");

        var jugadorElegible = await _db.JugadorEquipos.AnyAsync(je =>
            je.IdJugador == req.IdJugador
            && (je.IdEquipo == partido.IdEquipoLocal || je.IdEquipo == partido.IdEquipoVisitante)
            && je.FechaDesde <= fechaPartido
            && (je.FechaHasta == null || je.FechaHasta >= fechaPartido));
        if (!jugadorElegible)
            return ServiceResult<PartidoDetalleDto>.Fail("El jugador no pertenecía a ninguno de los equipos en la fecha del partido.");

        var evento = new EventoPartido
        {
            IdPartido  = idPartido,
            IdJugador  = req.IdJugador,
            TipoEvento = tipoEvento,
            Minuto     = req.Minuto,
            CreatedAt  = DateTime.UtcNow,
        };

        try
        {
            _db.EventosPartido.Add(evento);
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex)
        {
            var detalle = ex.InnerException?.Message ?? ex.Message;
            return ServiceResult<PartidoDetalleDto>.Fail($"No se pudo registrar el evento: {detalle}");
        }

        if (partido.Jugado && tipoEvento == "GOL")
        {
            await ActualizarMarcadorDesdeEventosAsync(partido);
            await _db.SaveChangesAsync();
            await RecalcularPosicionesAsync(partido.IdJornada);
        }
        return await GetPartidoDetalleAsync(idPartido);
    }

    public async Task<ServiceResult> EliminarEventoAsync(int idEvento)
    {
        var e = await _db.EventosPartido.FindAsync(idEvento);
        if (e is null) return ServiceResult.Fail("Evento no encontrado.");
        var partido = await _db.Partidos.FindAsync(e.IdPartido);
        if (partido is null) return ServiceResult.Fail("Partido no encontrado.");
        _db.EventosPartido.Remove(e);
        await _db.SaveChangesAsync();
        if (partido.Jugado && e.TipoEvento == "GOL")
        {
            await ActualizarMarcadorDesdeEventosAsync(partido);
            await _db.SaveChangesAsync();
            await RecalcularPosicionesAsync(partido.IdJornada);
        }
        return ServiceResult.Ok();
    }

    public async Task<ServiceResult> EliminarPartidoAsync(int idPartido)
    {
        var p = await _db.Partidos.Include(p => p.Eventos).FirstOrDefaultAsync(p => p.IdPartido == idPartido);
        if (p is null) return ServiceResult.Fail("Partido no encontrado.");
        _db.EventosPartido.RemoveRange(p.Eventos);
        _db.Partidos.Remove(p);
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    // ── Helper privado ───────────────────────────────────────────────────────

    private async Task<ServiceResult> ValidarDesignacionesAsync(List<DesignacionPartidoRequest>? solicitudes, int idModalidad)
    {
        if (solicitudes is null) return ServiceResult.Ok();
        var cargosObligatorios = await _db.ModalidadCargos
            .Where(mc => mc.IdModalidad == idModalidad && mc.Obligatorio)
            .Select(mc => mc.IdCargo)
            .ToListAsync();
        if (cargosObligatorios.Any(idCargo => !solicitudes.Any(o => o.IdCargo == idCargo)))
            return ServiceResult.Fail("Debes asignar todos los cargos oficiales obligatorios para esta modalidad.");
        if (solicitudes.Count == 0) return ServiceResult.Ok();
        if (solicitudes.Select(o => o.IdCargo).Distinct().Count() != solicitudes.Count)
            return ServiceResult.Fail("No se puede repetir un cargo oficial en el mismo partido.");
        if (solicitudes.Select(o => o.IdArbitro).Distinct().Count() != solicitudes.Count)
            return ServiceResult.Fail("Una persona no puede ocupar dos cargos en el mismo partido.");

        var cargos = await _db.CargosOficiales
            .Where(c => solicitudes.Select(o => o.IdCargo).Contains(c.IdCargo))
            .Select(c => c.IdCargo)
            .ToListAsync();
        if (cargos.Count != solicitudes.Select(o => o.IdCargo).Distinct().Count())
            return ServiceResult.Fail("Uno de los cargos oficiales no existe.");

        var arbitros = await _db.Arbitros
            .Where(a => solicitudes.Select(o => o.IdArbitro).Contains(a.IdArbitro))
            .Select(a => a.IdArbitro)
            .ToListAsync();
        if (arbitros.Count != solicitudes.Select(o => o.IdArbitro).Distinct().Count())
            return ServiceResult.Fail("Uno de los oficiales seleccionados no existe.");
        return ServiceResult.Ok();
    }

    private async Task ActualizarMarcadorDesdeEventosAsync(Partido partido)
    {
        var fecha = DateOnly.FromDateTime(partido.Fecha);
        var jugadoresLocal = await _db.JugadorEquipos
            .Where(je => je.IdEquipo == partido.IdEquipoLocal
                && je.FechaDesde <= fecha
                && (je.FechaHasta == null || je.FechaHasta >= fecha))
            .Select(je => je.IdJugador)
            .ToListAsync();
        var jugadoresVisitante = await _db.JugadorEquipos
            .Where(je => je.IdEquipo == partido.IdEquipoVisitante
                && je.FechaDesde <= fecha
                && (je.FechaHasta == null || je.FechaHasta >= fecha))
            .Select(je => je.IdJugador)
            .ToListAsync();
        var goles = await _db.EventosPartido
            .Where(e => e.IdPartido == partido.IdPartido && e.TipoEvento == "GOL")
            .ToListAsync();

        partido.GolesLocal = goles.Count(e => jugadoresLocal.Contains(e.IdJugador));
        partido.GolesVisitante = goles.Count(e => jugadoresVisitante.Contains(e.IdJugador));
    }

    private async Task RecalcularPosicionesAsync(int idJornada)
    {
        var jornada = await _db.Jornadas
            .Include(j => j.Grupo)
            .FirstOrDefaultAsync(j => j.IdJornada == idJornada);
        if (jornada?.IdGrupo is null) return;

        var idGrupo = jornada.IdGrupo.Value;
        var equipos = await _db.GrupoEquipos
            .Where(ge => ge.IdGrupo == idGrupo)
            .Select(ge => ge.IdEquipo)
            .ToListAsync();
        var partidos = await _db.Partidos
            .Where(p => p.Jornada.IdGrupo == idGrupo && p.Jugado)
            .ToListAsync();

        var posiciones = equipos.ToDictionary(id => id, _ => new PosicionGrupo { IdGrupo = idGrupo });
        foreach (var idEquipo in equipos) posiciones[idEquipo].IdEquipo = idEquipo;

        foreach (var partido in partidos)
        {
            if (!posiciones.TryGetValue(partido.IdEquipoLocal, out var local)
                || !posiciones.TryGetValue(partido.IdEquipoVisitante, out var visitante))
                continue;
            var golesLocal = partido.GolesLocal ?? 0;
            var golesVisitante = partido.GolesVisitante ?? 0;

            local.Pj++;
            visitante.Pj++;
            local.Gf += golesLocal;
            local.Gc += golesVisitante;
            visitante.Gf += golesVisitante;
            visitante.Gc += golesLocal;

            if (golesLocal > golesVisitante) { local.Pg++; local.Pts += 3; visitante.Pp++; }
            else if (golesLocal < golesVisitante) { visitante.Pg++; visitante.Pts += 3; local.Pp++; }
            else { local.Pe++; local.Pts++; visitante.Pe++; visitante.Pts++; }
        }

        var existentes = await _db.PosicionesGrupo.Where(p => p.IdGrupo == idGrupo).ToListAsync();
        _db.PosicionesGrupo.RemoveRange(existentes);
        _db.PosicionesGrupo.AddRange(posiciones.Values);
        await _db.SaveChangesAsync();
    }

    private async Task<ServiceResult<PartidoDetalleDto>> GetPartidoDetalleAsync(int idPartido)
    {
        var p = await _db.Partidos
            .Include(p => p.EquipoLocal)
            .Include(p => p.EquipoVisitante)
            .Include(p => p.Estadio)
            .Include(p => p.Arbitro).ThenInclude(a => a.Persona)
            .Include(p => p.Oficiales).ThenInclude(o => o.Cargo)
            .Include(p => p.Oficiales).ThenInclude(o => o.Arbitro).ThenInclude(a => a.Persona)
            .Include(p => p.Eventos).ThenInclude(e => e.Jugador).ThenInclude(j => j.Persona)
            .Include(p => p.Jornada)
            .FirstOrDefaultAsync(p => p.IdPartido == idPartido);

        if (p is null) return ServiceResult<PartidoDetalleDto>.Fail("Partido no encontrado.");

        var numero = await _db.Partidos
            .Where(x => x.IdJornada == p.IdJornada && x.IdPartido <= p.IdPartido)
            .CountAsync();

        return ServiceResult<PartidoDetalleDto>.Ok(ToPartidoDetalleDto(p, numero));
    }
}
