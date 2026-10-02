namespace LigaManager.Infrastructure.Services;
using LigaManager.Application.Common;
using LigaManager.Application.DTOs.Estadisticas;
using LigaManager.Application.Interfaces;
using LigaManager.Domain.Entities;
using LigaManager.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

// Estadísticas de solo lectura (posiciones con forma, goleadores, tarjetas, suspensiones).
// No modifica nada; todas las consultas van sobre tablas ya existentes.
public class EstadisticasService : IEstadisticasService
{
    private readonly LigaManagerContext _db;
    private readonly AccesoCampeonato _acceso;
    private readonly ReglasDisciplinariasOptions _reglas;

    public EstadisticasService(LigaManagerContext db, AccesoCampeonato acceso, IOptions<ReglasDisciplinariasOptions> reglas)
    {
        _db = db;
        _acceso = acceso;
        _reglas = reglas.Value;
    }

    // ── Módulo A: Posiciones con forma ───────────────────────────────────────

    public async Task<TablaPosicionesDto> GetPosicionesAsync(int idCampeonato, int? idGrupo)
    {
        if (!await _acceso.CampeonatoAsync(idCampeonato)) return new TablaPosicionesDto(false, []);

        // "Forma": últimos 5 partidos jugados y no desiertos, calculado una sola vez para todo
        // el campeonato (evita una consulta por equipo).
        var partidosParaForma = await _db.Partidos
            .AsNoTracking()
            .Where(p => p.Jornada.IdCampeonato == idCampeonato && p.Jugado && !p.Desierto)
            .Select(p => new PartidoFormaRaw(p.Fecha, p.IdEquipoLocal, p.IdEquipoVisitante, p.GolesLocal ?? 0, p.GolesVisitante ?? 0))
            .ToListAsync();

        // Equipos que clasifican: los de la primera fase del campeonato (si existe alguna), igual
        // que ya hace GrupoService para la tabla existente. Si no hay fases, 2 por defecto.
        var equiposClasifican = await _db.FasesCampeonato
            .Where(f => f.IdCampeonato == idCampeonato)
            .OrderBy(f => f.Orden)
            .Select(f => (int?)f.EquiposClasifican)
            .FirstOrDefaultAsync() ?? 2;

        var grupos = await _db.Grupos
            .AsNoTracking()
            .Where(g => g.IdCampeonato == idCampeonato && (!idGrupo.HasValue || g.IdGrupo == idGrupo.Value))
            .OrderBy(g => g.Nombre)
            .ToListAsync();

        if (grupos.Count > 0)
        {
            var idsGrupo = grupos.Select(g => g.IdGrupo).ToList();
            var posicionesPorGrupo = await _db.PosicionesGrupo
                .AsNoTracking()
                .Where(p => idsGrupo.Contains(p.IdGrupo))
                .Include(p => p.Equipo)
                .ToListAsync();

            var gruposDto = grupos.Select(g =>
            {
                var ordenadas = posicionesPorGrupo
                    .Where(p => p.IdGrupo == g.IdGrupo)
                    .OrderByDescending(p => p.Pts).ThenByDescending(p => p.Pg)
                    .ThenByDescending(p => p.Gf - p.Gc).ThenByDescending(p => p.Gf)
                    .ToList();

                var dtos = ordenadas.Select((p, i) => new PosicionConFormaDto(
                    i + 1, p.IdEquipo, p.Equipo.Nombre, p.Pj, p.Pg, p.Pe, p.Pp,
                    p.Gf, p.Gc, p.Gf - p.Gc, p.Pts, i < equiposClasifican,
                    FormaDeEquipo(p.IdEquipo, partidosParaForma)
                )).ToList();

                return new GrupoPosicionesDto(g.IdGrupo, g.Nombre, dtos);
            }).ToList();

            return new TablaPosicionesDto(true, gruposDto);
        }

        // Campeonato sin grupos: la tabla no vive en posicion_grupo (esa tabla solo se llena por
        // grupo), así que se calcula en vivo igual que GrupoService.GetPosicionesCampeonatoAsync.
        var equipos = await _db.CampeonatoEquipos
            .AsNoTracking()
            .Where(ce => ce.IdCampeonato == idCampeonato)
            .Include(ce => ce.Equipo)
            .ToListAsync();

        var partidosJugados = await _db.Partidos
            .AsNoTracking()
            .Where(p => p.Jornada.IdCampeonato == idCampeonato && p.Jugado)
            .ToListAsync();

        var posiciones = equipos.ToDictionary(ce => ce.IdEquipo, ce => new PosicionGrupo { IdGrupo = 0, IdEquipo = ce.IdEquipo });

        foreach (var partido in partidosJugados)
        {
            if (!posiciones.TryGetValue(partido.IdEquipoLocal, out var local)
                || !posiciones.TryGetValue(partido.IdEquipoVisitante, out var visitante))
                continue;

            if (partido.Desierto) { local.Pj++; visitante.Pj++; continue; }

            var golesLocal = partido.GolesLocal ?? 0;
            var golesVisitante = partido.GolesVisitante ?? 0;
            local.Pj++; visitante.Pj++;
            local.Gf += golesLocal; local.Gc += golesVisitante;
            visitante.Gf += golesVisitante; visitante.Gc += golesLocal;

            if (golesLocal > golesVisitante) { local.Pg++; local.Pts += 3; visitante.Pp++; }
            else if (golesLocal < golesVisitante) { visitante.Pg++; visitante.Pts += 3; local.Pp++; }
            else { local.Pe++; local.Pts++; visitante.Pe++; visitante.Pts++; }
        }

        var ordenadoSinGrupo = posiciones.Values
            .Join(equipos, p => p.IdEquipo, ce => ce.IdEquipo, (p, ce) => new { p, ce.Equipo.Nombre })
            .OrderByDescending(x => x.p.Pts).ThenByDescending(x => x.p.Pg)
            .ThenByDescending(x => x.p.Gf - x.p.Gc).ThenByDescending(x => x.p.Gf)
            .ToList();

        var dtosSinGrupo = ordenadoSinGrupo.Select((x, i) => new PosicionConFormaDto(
            i + 1, x.p.IdEquipo, x.Nombre, x.p.Pj, x.p.Pg, x.p.Pe, x.p.Pp,
            x.p.Gf, x.p.Gc, x.p.Gf - x.p.Gc, x.p.Pts, i < equiposClasifican,
            FormaDeEquipo(x.p.IdEquipo, partidosParaForma)
        )).ToList();

        return new TablaPosicionesDto(false, [new GrupoPosicionesDto(null, null, dtosSinGrupo)]);
    }

    private record PartidoFormaRaw(DateTime Fecha, int IdEquipoLocal, int IdEquipoVisitante, int GolesLocal, int GolesVisitante);

    private static List<string> FormaDeEquipo(int idEquipo, List<PartidoFormaRaw> partidos)
    {
        var ultimos5 = partidos
            .Where(p => p.IdEquipoLocal == idEquipo || p.IdEquipoVisitante == idEquipo)
            .OrderByDescending(p => p.Fecha)
            .Take(5)
            .OrderBy(p => p.Fecha) // cronológico: el más antiguo de los 5, primero
            .ToList();

        return ultimos5.Select(p =>
        {
            var esLocal = p.IdEquipoLocal == idEquipo;
            var golesPropios = esLocal ? p.GolesLocal : p.GolesVisitante;
            var golesRival = esLocal ? p.GolesVisitante : p.GolesLocal;
            return golesPropios > golesRival ? "V" : golesPropios < golesRival ? "D" : "E";
        }).ToList();
    }

    // ── Módulo B: Goleadores ──────────────────────────────────────────────────

    public async Task<List<GoleadorDto>> GetGoleadoresAsync(int idCampeonato, int? top)
    {
        if (!await _acceso.CampeonatoAsync(idCampeonato)) return [];

        // El autogol (GOL_EN_CONTRA) no cuenta para el goleador: solo "GOL".
        var goles = await _db.EventosPartido
            .AsNoTracking()
            .Where(e => e.TipoEvento == "GOL" && e.Partido.Jugado && e.Partido.Jornada.IdCampeonato == idCampeonato)
            .GroupBy(e => e.IdJugador)
            .Select(g => new { IdJugador = g.Key, Goles = g.Count() })
            .ToListAsync();

        if (goles.Count == 0) return [];

        var idsJugadores = goles.Select(g => g.IdJugador).ToList();

        // Partidos jugados = partidos (jugado=true) donde el jugador aparece en la alineación.
        // Se complementa con los partidos donde tiene algún evento (por si se registró un gol sin
        // pasar por la alineación, por ejemplo usando la API directamente): nunca debe dar menos
        // partidos que goles en partidos distintos.
        var partidosDesdeAlineacion = await _db.Alineaciones
            .AsNoTracking()
            .Where(a => idsJugadores.Contains(a.IdJugador) && a.Partido.Jugado && a.Partido.Jornada.IdCampeonato == idCampeonato)
            .Select(a => new { a.IdJugador, a.IdPartido })
            .ToListAsync();
        var partidosDesdeEventos = await _db.EventosPartido
            .AsNoTracking()
            .Where(e => idsJugadores.Contains(e.IdJugador) && e.Partido.Jugado && e.Partido.Jornada.IdCampeonato == idCampeonato)
            .Select(e => new { e.IdJugador, e.IdPartido })
            .ToListAsync();
        var partidosPorJugador = partidosDesdeAlineacion.Concat(partidosDesdeEventos)
            .Distinct()
            .GroupBy(x => x.IdJugador)
            .ToDictionary(g => g.Key, g => g.Count());

        var jugadoresInfo = await _db.Jugadores
            .AsNoTracking()
            .Where(j => idsJugadores.Contains(j.IdJugador))
            .Include(j => j.Persona)
            .Include(j => j.JugadorEquipos).ThenInclude(je => je.Equipo)
            .ToListAsync();
        var infoPorJugador = jugadoresInfo.ToDictionary(j => j.IdJugador);

        var resultado = goles.Select(g =>
        {
            var jugador = infoPorJugador[g.IdJugador];
            var pj = partidosPorJugador.GetValueOrDefault(g.IdJugador, 0);
            return new GoleadorDto(
                g.IdJugador,
                $"{jugador.Persona.Nombre} {jugador.Persona.Apellido}",
                EquipoActual(jugador),
                g.Goles,
                pj,
                pj > 0 ? Math.Round((double)g.Goles / pj, 2) : 0
            );
        })
        .OrderByDescending(x => x.Goles).ThenByDescending(x => x.PromedioPorPartido)
        .ToList();

        if (top is > 0) resultado = resultado.Take(top.Value).ToList();
        return resultado;
    }

    // Equipo "actual" del jugador: el vínculo sin fecha_hasta (activo); si no tiene uno activo,
    // el más reciente por fecha_desde. Es una etiqueta de visualización, no afecta los cálculos
    // de fair play / suspensiones, que usan el equipo vigente a la fecha de cada evento.
    private static string EquipoActual(Jugador jugador)
    {
        var vinculo = jugador.JugadorEquipos
            .OrderByDescending(je => je.FechaHasta == null)
            .ThenByDescending(je => je.FechaDesde)
            .FirstOrDefault();
        return vinculo?.Equipo.Nombre ?? "—";
    }

    // ── Módulo B: Tarjetas ────────────────────────────────────────────────────

    public async Task<TarjetasDto> GetTarjetasAsync(int idCampeonato)
    {
        if (!await _acceso.CampeonatoAsync(idCampeonato)) return new TarjetasDto([], []);

        var eventos = await _db.EventosPartido
            .AsNoTracking()
            .Where(e => (e.TipoEvento == "TARJETA_AMARILLA" || e.TipoEvento == "TARJETA_ROJA")
                     && e.Partido.Jugado && e.Partido.Jornada.IdCampeonato == idCampeonato)
            .Select(e => new { e.IdJugador, e.TipoEvento, e.Partido.Fecha, e.Partido.IdEquipoLocal, e.Partido.IdEquipoVisitante })
            .ToListAsync();

        if (eventos.Count == 0) return new TarjetasDto([], []);

        var idsJugadores = eventos.Select(e => e.IdJugador).Distinct().ToList();
        var jugadoresInfo = await _db.Jugadores
            .AsNoTracking()
            .Where(j => idsJugadores.Contains(j.IdJugador))
            .Include(j => j.Persona)
            .Include(j => j.JugadorEquipos).ThenInclude(je => je.Equipo)
            .ToListAsync();
        var infoPorJugador = jugadoresInfo.ToDictionary(j => j.IdJugador);

        var porJugador = eventos.GroupBy(e => e.IdJugador).Select(g =>
        {
            var jugador = infoPorJugador[g.Key];
            var amarillas = g.Count(e => e.TipoEvento == "TARJETA_AMARILLA");
            var rojas = g.Count(e => e.TipoEvento == "TARJETA_ROJA");
            return new TarjetasJugadorDto(g.Key, $"{jugador.Persona.Nombre} {jugador.Persona.Apellido}", EquipoActual(jugador), amarillas, rojas, amarillas + rojas);
        })
        .OrderByDescending(x => x.Total).ThenByDescending(x => x.Rojas)
        .ToList();

        // Fair play por equipo: con el equipo vigente a la fecha de CADA tarjeta (no el actual),
        // porque es a ese equipo al que le pesa la sanción en ese momento del torneo.
        var porEquipoAcumulado = new Dictionary<int, (int Amarillas, int Rojas)>();
        foreach (var e in eventos)
        {
            var jugador = infoPorJugador[e.IdJugador];
            var fecha = DateOnly.FromDateTime(e.Fecha);
            var vinculo = jugador.JugadorEquipos.FirstOrDefault(je =>
                (je.IdEquipo == e.IdEquipoLocal || je.IdEquipo == e.IdEquipoVisitante)
                && je.FechaDesde <= fecha && (je.FechaHasta == null || je.FechaHasta >= fecha));
            if (vinculo is null) continue;

            if (!porEquipoAcumulado.TryGetValue(vinculo.IdEquipo, out var actual)) actual = (0, 0);
            porEquipoAcumulado[vinculo.IdEquipo] = e.TipoEvento == "TARJETA_AMARILLA"
                ? (actual.Amarillas + 1, actual.Rojas)
                : (actual.Amarillas, actual.Rojas + 1);
        }

        var idsEquipo = porEquipoAcumulado.Keys.ToList();
        var nombresEquipo = await _db.Equipos
            .AsNoTracking()
            .Where(eq => idsEquipo.Contains(eq.IdEquipo))
            .ToDictionaryAsync(eq => eq.IdEquipo, eq => eq.Nombre);

        var porEquipo = porEquipoAcumulado.Select(kv => new FairPlayEquipoDto(
            kv.Key, nombresEquipo.GetValueOrDefault(kv.Key, "—"),
            kv.Value.Amarillas, kv.Value.Rojas, kv.Value.Amarillas * 1 + kv.Value.Rojas * 3
        ))
        .OrderBy(x => x.PuntosFairPlay)
        .ToList();

        return new TarjetasDto(porJugador, porEquipo);
    }

    // ── Módulo B: Suspensiones ────────────────────────────────────────────────

    public async Task<SuspensionesDto> GetSuspensionesAsync(int idCampeonato)
    {
        if (!await _acceso.CampeonatoAsync(idCampeonato)) return new SuspensionesDto([], []);

        var eventos = await _db.EventosPartido
            .AsNoTracking()
            .Where(e => (e.TipoEvento == "TARJETA_AMARILLA" || e.TipoEvento == "TARJETA_ROJA")
                     && e.Partido.Jugado && e.Partido.Jornada.IdCampeonato == idCampeonato)
            .Select(e => new { e.IdJugador, e.TipoEvento, e.Minuto, e.IdPartido, e.Partido.Fecha, e.Partido.IdEquipoLocal, e.Partido.IdEquipoVisitante })
            .ToListAsync();

        var sancionesManuales = await _db.SancionesManuales
            .AsNoTracking()
            .Where(s => s.IdCampeonato == idCampeonato)
            .ToListAsync();

        if (eventos.Count == 0 && sancionesManuales.Count == 0) return new SuspensionesDto([], []);

        var idsJugadores = eventos.Select(e => e.IdJugador)
            .Concat(sancionesManuales.Select(s => s.IdJugador))
            .Distinct().ToList();
        var jugadoresInfo = await _db.Jugadores
            .AsNoTracking()
            .Where(j => idsJugadores.Contains(j.IdJugador))
            .Include(j => j.Persona)
            .Include(j => j.JugadorEquipos).ThenInclude(je => je.Equipo)
            .ToListAsync();
        var infoPorJugador = jugadoresInfo.ToDictionary(j => j.IdJugador);

        var idsEquipoCampeonato = await _db.CampeonatoEquipos
            .AsNoTracking()
            .Where(ce => ce.IdCampeonato == idCampeonato)
            .Select(ce => ce.IdEquipo)
            .ToListAsync();

        // Partidos jugados del campeonato, para saber cuántos de ellos el equipo sancionado ya
        // disputó después de la sanción (y así saber si ya "cumplió" los partidos de castigo).
        var partidosCampeonato = await _db.Partidos
            .AsNoTracking()
            .Where(p => p.Jornada.IdCampeonato == idCampeonato && p.Jugado)
            .Select(p => new { p.Fecha, p.IdEquipoLocal, p.IdEquipoVisitante })
            .OrderBy(p => p.Fecha)
            .ToListAsync();

        int PartidosJugadosDespues(int idEquipo, DateOnly fecha) => partidosCampeonato.Count(p =>
            DateOnly.FromDateTime(p.Fecha) > fecha && (p.IdEquipoLocal == idEquipo || p.IdEquipoVisitante == idEquipo));

        (string Nombre, int IdEquipo) EquipoALaFecha(Jugador jugador, DateOnly fecha, int idEquipoLocal, int idEquipoVisitante)
        {
            var vinculo = jugador.JugadorEquipos.FirstOrDefault(je =>
                (je.IdEquipo == idEquipoLocal || je.IdEquipo == idEquipoVisitante)
                && je.FechaDesde <= fecha && (je.FechaHasta == null || je.FechaHasta >= fecha));
            return vinculo is null ? ("—", 0) : (vinculo.Equipo.Nombre, vinculo.IdEquipo);
        }

        // Para una sanción manual no hay un partido de origen con dos equipos conocidos: se busca
        // el equipo del jugador entre los inscritos en ESTE campeonato, vigente a la fecha de la decisión.
        (string Nombre, int IdEquipo) EquipoEnCampeonatoALaFecha(Jugador jugador, DateOnly fecha)
        {
            var vinculo = jugador.JugadorEquipos.FirstOrDefault(je =>
                idsEquipoCampeonato.Contains(je.IdEquipo)
                && je.FechaDesde <= fecha && (je.FechaHasta == null || je.FechaHasta >= fecha));
            return vinculo is null ? ("—", 0) : (vinculo.Equipo.Nombre, vinculo.IdEquipo);
        }

        var sanciones = new List<SuspensionDto>();
        var enRiesgo = new List<JugadorEnRiesgoDto>();

        foreach (var grupoJugador in eventos.GroupBy(e => e.IdJugador))
        {
            var jugador = infoPorJugador[grupoJugador.Key];
            var nombreJugador = $"{jugador.Persona.Nombre} {jugador.Persona.Apellido}";

            // Agrupado por partido y en orden cronológico: una doble amarilla solo cuenta si fue
            // en el mismo partido.
            var porPartido = grupoJugador
                .GroupBy(e => new { e.IdPartido, e.Fecha, e.IdEquipoLocal, e.IdEquipoVisitante })
                .OrderBy(g => g.Key.Fecha)
                .ToList();

            var acumuladasEnCiclo = 0;
            var sancionesDeEsteJugador = new List<SuspensionDto>();

            foreach (var partidoGrupo in porPartido)
            {
                var amarillas = partidoGrupo.Count(e => e.TipoEvento == "TARJETA_AMARILLA");
                var rojas = partidoGrupo.Count(e => e.TipoEvento == "TARJETA_ROJA");

                string? motivo = null;
                var partidosSancion = 0;

                // Si en el mismo partido hubo alguna amarilla junto con la roja (2 amarillas, o
                // 1 amarilla + la roja que la sigue, como suele registrarse en la práctica), es una
                // expulsión por doble amarilla, no una roja directa, aunque también se haya
                // registrado el evento TARJETA_ROJA. Solo es "roja directa" cuando no hubo ninguna
                // amarilla de por medio en ese partido.
                if (amarillas >= 2 || (amarillas >= 1 && rojas >= 1))
                {
                    motivo = "Doble amarilla";
                    partidosSancion = _reglas.PartidosSuspensionPorDobleAmarilla;
                }
                else if (rojas >= 1)
                {
                    motivo = "Roja directa";
                    partidosSancion = _reglas.PartidosSuspensionPorRoja;
                }
                else if (amarillas == 1)
                {
                    acumuladasEnCiclo++;
                    if (acumuladasEnCiclo >= _reglas.AmarillasParaSuspension)
                    {
                        motivo = $"{_reglas.AmarillasParaSuspension} amarillas acumuladas";
                        partidosSancion = _reglas.PartidosSuspensionPorAcumulacion;
                        acumuladasEnCiclo = 0;
                    }
                }

                if (motivo is null) continue;

                var fechaSancion = DateOnly.FromDateTime(partidoGrupo.Key.Fecha);
                var (equipoNombre, idEquipoSancion) = EquipoALaFecha(jugador, fechaSancion, partidoGrupo.Key.IdEquipoLocal, partidoGrupo.Key.IdEquipoVisitante);
                var partidosCumplidos = Math.Min(PartidosJugadosDespues(idEquipoSancion, fechaSancion), partidosSancion);
                var estado = partidosCumplidos >= partidosSancion ? "Cumplida" : "Suspendido";

                sancionesDeEsteJugador.Add(new SuspensionDto(
                    grupoJugador.Key, nombreJugador, equipoNombre, motivo,
                    partidoGrupo.Key.IdPartido, fechaSancion.ToString("yyyy-MM-dd"),
                    partidosSancion, partidosCumplidos, estado, Manual: false));
            }

            sanciones.AddRange(sancionesDeEsteJugador);

            var tieneSuspensionActiva = sancionesDeEsteJugador.Any(s => s.Estado == "Suspendido");
            if (!tieneSuspensionActiva && acumuladasEnCiclo == _reglas.AmarillasParaSuspension - 1)
            {
                enRiesgo.Add(new JugadorEnRiesgoDto(grupoJugador.Key, nombreJugador, EquipoActual(jugador), acumuladasEnCiclo));
            }
        }

        foreach (var s in sancionesManuales)
        {
            var jugador = infoPorJugador[s.IdJugador];
            var nombreJugador = $"{jugador.Persona.Nombre} {jugador.Persona.Apellido}";
            var (equipoNombre, idEquipoSancion) = EquipoEnCampeonatoALaFecha(jugador, s.FechaDecision);
            var partidosCumplidos = Math.Min(PartidosJugadosDespues(idEquipoSancion, s.FechaDecision), s.PartidosSancion);
            var estado = partidosCumplidos >= s.PartidosSancion ? "Cumplida" : "Suspendido";

            sanciones.Add(new SuspensionDto(
                s.IdJugador, nombreJugador, equipoNombre, s.Motivo,
                null, s.FechaDecision.ToString("yyyy-MM-dd"),
                s.PartidosSancion, partidosCumplidos, estado, Manual: true, IdSancion: s.IdSancion));
        }

        return new SuspensionesDto(
            sanciones.OrderByDescending(s => s.FechaPartidoSancion).ToList(),
            enRiesgo.OrderByDescending(r => r.AmarillasAcumuladas).ToList()
        );
    }

    public async Task<ServiceResult<SuspensionDto>> AgregarSancionManualAsync(int idCampeonato, AgregarSancionManualRequest req)
    {
        if (!await _acceso.CampeonatoAsync(idCampeonato)) return ServiceResult<SuspensionDto>.Fail("Campeonato no encontrado.");

        var motivo = req.Motivo?.Trim();
        if (string.IsNullOrWhiteSpace(motivo))
            return ServiceResult<SuspensionDto>.Fail("El motivo es obligatorio.");
        if (motivo.Length > 200)
            return ServiceResult<SuspensionDto>.Fail("El motivo no puede superar los 200 caracteres.");
        if (req.PartidosSancion <= 0)
            return ServiceResult<SuspensionDto>.Fail("Los partidos de sanción deben ser un número mayor a 0.");

        DateOnly fechaDecision;
        if (string.IsNullOrWhiteSpace(req.FechaDecision))
            fechaDecision = DateOnly.FromDateTime(DateTime.Today);
        else if (!DateOnly.TryParse(req.FechaDecision, out fechaDecision))
            return ServiceResult<SuspensionDto>.Fail("Formato de fecha inválido. Use yyyy-MM-dd.");

        var idsEquipoCampeonato = await _db.CampeonatoEquipos
            .Where(ce => ce.IdCampeonato == idCampeonato)
            .Select(ce => ce.IdEquipo)
            .ToListAsync();

        var jugador = await _db.Jugadores
            .Include(j => j.Persona)
            .Include(j => j.JugadorEquipos).ThenInclude(je => je.Equipo)
            .FirstOrDefaultAsync(j => j.IdJugador == req.IdJugador);
        if (jugador is null) return ServiceResult<SuspensionDto>.Fail("Jugador no encontrado.");
        if (!jugador.JugadorEquipos.Any(je => idsEquipoCampeonato.Contains(je.IdEquipo)))
            return ServiceResult<SuspensionDto>.Fail("El jugador no pertenece a ningún equipo de este campeonato.");

        var sancion = new SancionManual
        {
            IdCampeonato    = idCampeonato,
            IdJugador       = req.IdJugador,
            Motivo          = motivo,
            PartidosSancion = req.PartidosSancion,
            FechaDecision   = fechaDecision,
            CreatedAt       = DateTime.UtcNow,
        };
        _db.SancionesManuales.Add(sancion);
        await _db.SaveChangesAsync();

        var vinculo = jugador.JugadorEquipos.FirstOrDefault(je =>
            idsEquipoCampeonato.Contains(je.IdEquipo)
            && je.FechaDesde <= fechaDecision && (je.FechaHasta == null || je.FechaHasta >= fechaDecision));
        var equipoNombre = vinculo?.Equipo.Nombre ?? "—";
        var idEquipoSancion = vinculo?.IdEquipo ?? 0;

        var partidosJugadosDespues = await _db.Partidos
            .CountAsync(p => p.Jornada.IdCampeonato == idCampeonato && p.Jugado && p.Fecha > fechaDecision.ToDateTime(TimeOnly.MinValue)
                && (p.IdEquipoLocal == idEquipoSancion || p.IdEquipoVisitante == idEquipoSancion));
        var partidosCumplidos = Math.Min(partidosJugadosDespues, sancion.PartidosSancion);
        var estado = partidosCumplidos >= sancion.PartidosSancion ? "Cumplida" : "Suspendido";

        return ServiceResult<SuspensionDto>.Ok(new SuspensionDto(
            jugador.IdJugador, $"{jugador.Persona.Nombre} {jugador.Persona.Apellido}", equipoNombre, sancion.Motivo,
            null, sancion.FechaDecision.ToString("yyyy-MM-dd"), sancion.PartidosSancion, partidosCumplidos, estado, Manual: true, IdSancion: sancion.IdSancion));
    }

    public async Task<ServiceResult> EliminarSancionManualAsync(int idCampeonato, int idSancion)
    {
        if (!await _acceso.CampeonatoAsync(idCampeonato)) return ServiceResult.Fail("Campeonato no encontrado.");

        var sancion = await _db.SancionesManuales
            .FirstOrDefaultAsync(s => s.IdSancion == idSancion && s.IdCampeonato == idCampeonato);
        if (sancion is null) return ServiceResult.Fail("Sanción no encontrada.");

        _db.SancionesManuales.Remove(sancion);
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }
}
