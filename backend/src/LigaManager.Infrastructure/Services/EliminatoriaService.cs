namespace LigaManager.Infrastructure.Services;
using LigaManager.Application.Common;
using LigaManager.Application.DTOs.Eliminatoria;
using LigaManager.Application.Interfaces;
using LigaManager.Domain.Entities;
using LigaManager.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

// Fase eliminatoria (llaves) de un campeonato.
//
// - El organizador la configura una vez: cuántos clasifican (2, 4, 8 o 16), tercer puesto,
//   regla de tarjetas y las reglas de cada ronda (partido único o ida y vuelta, gol de visitante,
//   criterio si la llave empata).
// - Modo manual: el organizador arma cada ronda eligiendo los cruces. La primera con los
//   clasificados que él marca; las siguientes con los ganadores de la anterior (el tercer puesto,
//   con los perdedores de las semifinales). Al armarla se crean sus jornadas y partidos.
// - El ganador de cada llave se calcula con los partidos jugados: global, gol de visitante (si
//   está activo), y luego penales (registrados en el último partido) o el mejor ubicado en la
//   tabla de la fase regular.
// - Los partidos de la fase llevan id_llave: la tabla de posiciones no los cuenta.
public class EliminatoriaService
{
    private readonly LigaManagerContext _db;
    private readonly AccesoCampeonato   _acceso;
    private readonly IGrupoService      _grupos;
    public EliminatoriaService(LigaManagerContext db, AccesoCampeonato acceso, IGrupoService grupos)
    { _db = db; _acceso = acceso; _grupos = grupos; }

    private static readonly TipoRonda[] OrdenRondas =
        [TipoRonda.OCTAVOS, TipoRonda.CUARTOS, TipoRonda.SEMIFINAL, TipoRonda.TERCER_PUESTO, TipoRonda.FINAL];

    public static string NombreRonda(TipoRonda t) => t switch
    {
        TipoRonda.OCTAVOS       => "Octavos de final",
        TipoRonda.CUARTOS       => "Cuartos de final",
        TipoRonda.SEMIFINAL     => "Semifinal",
        TipoRonda.TERCER_PUESTO => "Tercer puesto",
        _                       => "Final",
    };

    // Rondas que tiene la fase según cuántos clasifican.
    public static List<TipoRonda> RondasDe(int clasifican, bool tercerPuesto)
    {
        var l = new List<TipoRonda>();
        if (clasifican >= 16) l.Add(TipoRonda.OCTAVOS);
        if (clasifican >= 8)  l.Add(TipoRonda.CUARTOS);
        if (clasifican >= 4)  l.Add(TipoRonda.SEMIFINAL);
        if (clasifican >= 4 && tercerPuesto) l.Add(TipoRonda.TERCER_PUESTO);
        l.Add(TipoRonda.FINAL);
        return l;
    }

    private static int LlavesDe(TipoRonda t, int clasifican) => t switch
    {
        TipoRonda.OCTAVOS   => 8,
        TipoRonda.CUARTOS   => 4,
        TipoRonda.SEMIFINAL => 2,
        _                   => 1,
    };

    // Ronda de la que salen los equipos de esta (null = primera ronda: los clasificados).
    private static TipoRonda? Anterior(TipoRonda t, List<TipoRonda> rondas)
    {
        if (t is TipoRonda.FINAL or TipoRonda.TERCER_PUESTO)
            return rondas.Contains(TipoRonda.SEMIFINAL) ? TipoRonda.SEMIFINAL : null;
        var i = rondas.IndexOf(t);
        return i > 0 ? rondas[i - 1] : null;
    }

    private Task<FaseEliminatoria?> CargarAsync(int idCampeonato) => _db.FasesEliminatorias
        .Include(f => f.Rondas).ThenInclude(r => r.Llaves).ThenInclude(l => l.EquipoA)
        .Include(f => f.Rondas).ThenInclude(r => r.Llaves).ThenInclude(l => l.EquipoB)
        .Include(f => f.Rondas).ThenInclude(r => r.Llaves).ThenInclude(l => l.Partidos).ThenInclude(p => p.Jornada)
        .AsSplitQuery()
        .FirstOrDefaultAsync(f => f.IdCampeonato == idCampeonato);

    // ── Consulta ─────────────────────────────────────────────────────────────

    public async Task<ServiceResult<EliminatoriaDto>> ConsultarAsync(int idCampeonato)
    {
        if (!await _acceso.LecturaCampeonatoAsync(idCampeonato)) return ServiceResult<EliminatoriaDto>.Fail("Campeonato no encontrado.");
        var fase = await CargarAsync(idCampeonato);
        if (fase is null)
            return ServiceResult<EliminatoriaDto>.Ok(new EliminatoriaDto(false, "MANUAL", 0, false, nameof(ReglaTarjetasEliminatoria.BORRAR_SALVO_EXPULSION_FINAL), [], null));
        return ServiceResult<EliminatoriaDto>.Ok(await ArmarDtoAsync(fase));
    }

    private sealed record Resultado(int? GlobalA, int? GlobalB, int? IdGanador, string Estado, string? Detalle);

    private static int? GolesDe(Partido p, int idEquipo)
        => p.Desierto ? 0 : p.IdEquipoLocal == idEquipo ? p.GolesLocal : p.GolesVisitante;

    private static List<Partido> PartidosOrdenados(Llave l)
        => l.Partidos.OrderBy(p => p.Jornada.Numero).ThenBy(p => p.Fecha).ThenBy(p => p.IdPartido).ToList();

    // Ganador de una llave según sus partidos y las reglas de la ronda.
    private static Resultado Calcular(Llave l, RondaEliminatoria r, Dictionary<int, int> posiciones)
    {
        var partidos = PartidosOrdenados(l);
        var jugados = partidos.Where(p => p.Jugado).ToList();
        int? ga = jugados.Count > 0 ? jugados.Sum(p => GolesDe(p, l.IdEquipoA) ?? 0) : null;
        int? gb = jugados.Count > 0 ? jugados.Sum(p => GolesDe(p, l.IdEquipoB) ?? 0) : null;
        var global = r.IdaYVuelta ? $"Global {ga}-{gb}" : $"{ga}-{gb}";

        if (l.IdGanador is int manual)
            return new Resultado(ga, gb, manual, "DEFINIDA", "Definida por la organización");

        var esperados = r.IdaYVuelta ? 2 : 1;
        if (partidos.Count < esperados || jugados.Count < partidos.Count)
            return new Resultado(ga, gb, null, "PENDIENTE", null);

        if (ga != gb)
            return new Resultado(ga, gb, ga > gb ? l.IdEquipoA : l.IdEquipoB, "DEFINIDA", r.IdaYVuelta ? global : null);

        if (r.IdaYVuelta && r.GolVisitante)
        {
            var visA = partidos.Where(p => p.IdEquipoVisitante == l.IdEquipoA).Sum(p => GolesDe(p, l.IdEquipoA) ?? 0);
            var visB = partidos.Where(p => p.IdEquipoVisitante == l.IdEquipoB).Sum(p => GolesDe(p, l.IdEquipoB) ?? 0);
            if (visA != visB)
                return new Resultado(ga, gb, visA > visB ? l.IdEquipoA : l.IdEquipoB, "DEFINIDA", $"{global} · gol de visitante");
        }

        if (r.Desempate == DesempateRonda.MEJOR_UBICADO)
        {
            var pa = posiciones.GetValueOrDefault(l.IdEquipoA, int.MaxValue);
            var pb = posiciones.GetValueOrDefault(l.IdEquipoB, int.MaxValue);
            var gana = pa <= pb ? l.IdEquipoA : l.IdEquipoB;
            var pos = Math.Min(pa, pb);
            return new Resultado(ga, gb, gana, "DEFINIDA", pos == int.MaxValue ? $"{global} · pasa el mejor ubicado" : $"{global} · pasa el mejor ubicado ({pos}.º)");
        }

        // Penales: se registran en el último partido de la llave.
        var ultimo = partidos[^1];
        var penA = ultimo.IdEquipoLocal == l.IdEquipoA ? ultimo.PenalesLocal : ultimo.PenalesVisitante;
        var penB = ultimo.IdEquipoLocal == l.IdEquipoA ? ultimo.PenalesVisitante : ultimo.PenalesLocal;
        if (penA is int a && penB is int b && a != b)
            return new Resultado(ga, gb, a > b ? l.IdEquipoA : l.IdEquipoB, "DEFINIDA", $"{global} · penales {a}-{b}");
        return new Resultado(ga, gb, null, "FALTAN_PENALES", $"{global} · faltan los penales");
    }

    private async Task<Dictionary<int, int>> PosicionesAsync(int idCampeonato)
        => (await _grupos.GetPosicionesCampeonatoAsync(idCampeonato)).ToDictionary(p => p.IdEquipo, p => p.Posicion);

    private static EquipoLlaveDto Eq(Equipo e) => new(e.IdEquipo, e.Nombre, e.LogoUrl);

    private async Task<EliminatoriaDto> ArmarDtoAsync(FaseEliminatoria fase)
    {
        var posiciones = await PosicionesAsync(fase.IdCampeonato);
        var tipos = RondasDe(fase.EquiposClasifican, fase.TercerPuesto);
        var porTipo = fase.Rondas.ToDictionary(r => r.Tipo);
        var resultados = fase.Rondas.SelectMany(r => r.Llaves.Select(l => (l, r)))
            .ToDictionary(x => x.l.IdLlave, x => Calcular(x.l, x.r, posiciones));
        var equipos = fase.Rondas.SelectMany(r => r.Llaves).SelectMany(l => new[] { l.EquipoA, l.EquipoB })
            .DistinctBy(e => e.IdEquipo).ToDictionary(e => e.IdEquipo);

        bool Completa(TipoRonda t) => porTipo.TryGetValue(t, out var r) && r.Llaves.Count > 0
                                      && r.Llaves.All(l => resultados[l.IdLlave].IdGanador is not null);
        bool Creada(TipoRonda t) => porTipo.TryGetValue(t, out var r) && r.Llaves.Count > 0;
        var rondas = new List<RondaDto>();
        foreach (var t in tipos)
        {
            porTipo.TryGetValue(t, out var r);
            var ant = Anterior(t, tipos);
            var creada = Creada(t);
            var puedeCrearse = r is not null && !creada && (ant is null || Completa(ant.Value));
            // Se puede eliminar si ninguna ronda armada sale de esta y ninguno de sus partidos empezó.
            var puedeEliminarse = creada
                && !tipos.Any(x => Anterior(x, tipos) == t && Creada(x))
                && r!.Llaves.SelectMany(l => l.Partidos).All(p => !p.Jugado && p.EstadoRegistro == EstadoRegistro.SinIniciar);

            var candidatos = new List<EquipoLlaveDto>();
            if (puedeCrearse && ant is not null && porTipo.TryGetValue(ant.Value, out var ra))
            {
                foreach (var l in ra.Llaves.OrderBy(l => l.Orden))
                {
                    var g = resultados[l.IdLlave].IdGanador!.Value;
                    var id = t == TipoRonda.TERCER_PUESTO ? (g == l.IdEquipoA ? l.IdEquipoB : l.IdEquipoA) : g;
                    candidatos.Add(Eq(equipos[id]));
                }
            }

            var llaves = (r?.Llaves ?? []).OrderBy(l => l.Orden).Select(l =>
            {
                var res = resultados[l.IdLlave];
                var partidos = PartidosOrdenados(l).Select((p, i) => new PartidoLlaveDto(
                    p.IdPartido, p.IdJornada, p.Jornada.Numero,
                    !(r!.IdaYVuelta) ? "UNICO" : i == 0 ? "IDA" : "VUELTA",
                    p.Fecha.ToString("yyyy-MM-dd HH:mm"), p.Jugado,
                    p.Jugado ? GolesDe(p, l.IdEquipoA) : null, p.Jugado ? GolesDe(p, l.IdEquipoB) : null,
                    p.IdEquipoLocal == l.IdEquipoA ? p.PenalesLocal : p.PenalesVisitante,
                    p.IdEquipoLocal == l.IdEquipoA ? p.PenalesVisitante : p.PenalesLocal)).ToList();
                return new LlaveDto(l.IdLlave, l.Orden, Eq(l.EquipoA), Eq(l.EquipoB), partidos,
                    res.GlobalA, res.GlobalB, res.IdGanador, res.Estado, res.Detalle);
            }).ToList();

            rondas.Add(new RondaDto(
                t.ToString(), NombreRonda(t),
                r?.IdaYVuelta ?? false, (r?.Desempate ?? DesempateRonda.PENALES).ToString(), r?.GolVisitante ?? false,
                LlavesDe(t, fase.EquiposClasifican), creada, Completa(t), puedeCrearse, puedeEliminarse, llaves, candidatos));
        }

        EquipoLlaveDto? campeon = null;
        if (porTipo.TryGetValue(TipoRonda.FINAL, out var final) && final.Llaves.FirstOrDefault() is { } lf
            && resultados[lf.IdLlave].IdGanador is int idCampeon)
            campeon = Eq(equipos[idCampeon]);

        return new EliminatoriaDto(true, fase.Modo.ToString(), fase.EquiposClasifican, fase.TercerPuesto,
            fase.ReglaTarjetas.ToString(), rondas, campeon);
    }

    // ── Configuración ────────────────────────────────────────────────────────

    public async Task<ServiceResult<EliminatoriaDto>> GuardarAsync(int idCampeonato, GuardarEliminatoriaRequest req)
    {
        if (!await _acceso.CampeonatoAsync(idCampeonato)) return ServiceResult<EliminatoriaDto>.Fail("Campeonato no encontrado.");
        if (req.EquiposClasifican is not (2 or 4 or 8 or 16))
            return ServiceResult<EliminatoriaDto>.Fail("Los equipos que clasifican deben ser 2, 4, 8 o 16.");
        if (!Enum.TryParse<ReglaTarjetasEliminatoria>(req.ReglaTarjetas, out var regla))
            return ServiceResult<EliminatoriaDto>.Fail("Elija qué pasa con las tarjetas al empezar la fase.");
        var inscritos = await _db.CampeonatoEquipos.CountAsync(ce => ce.IdCampeonato == idCampeonato);
        if (req.EquiposClasifican > inscritos)
            return ServiceResult<EliminatoriaDto>.Fail($"El campeonato tiene {inscritos} equipos inscritos: no pueden clasificar {req.EquiposClasifican}.");

        var tercer = req.TercerPuesto && req.EquiposClasifican >= 4;
        var tipos = RondasDe(req.EquiposClasifican, tercer);
        var reglas = new Dictionary<TipoRonda, (bool idaYVuelta, DesempateRonda desempate, bool golVisitante)>();
        foreach (var c in req.Rondas ?? [])
        {
            if (!Enum.TryParse<TipoRonda>(c.Tipo, out var t) || !tipos.Contains(t)) continue;
            if (!Enum.TryParse<DesempateRonda>(c.Desempate, out var d))
                return ServiceResult<EliminatoriaDto>.Fail($"Criterio de empate no válido en {NombreRonda(t)}.");
            reglas[t] = (c.IdaYVuelta, d, c.IdaYVuelta && c.GolVisitante);
        }

        var fase = await CargarAsync(idCampeonato);
        if (fase is not null)
        {
            var creadas = fase.Rondas.Where(r => r.Llaves.Count > 0).ToList();
            if (creadas.Count > 0)
            {
                if (fase.EquiposClasifican != req.EquiposClasifican)
                    return ServiceResult<EliminatoriaDto>.Fail("No se puede cambiar cuántos clasifican: la fase ya tiene llaves armadas.");
                if (fase.TercerPuesto && !tercer && creadas.Any(r => r.Tipo == TipoRonda.TERCER_PUESTO))
                    return ServiceResult<EliminatoriaDto>.Fail("No se puede quitar el tercer puesto: ese partido ya está armado.");
                foreach (var r in creadas)
                    if (reglas.TryGetValue(r.Tipo, out var n) && n.idaYVuelta != r.IdaYVuelta)
                        return ServiceResult<EliminatoriaDto>.Fail($"{NombreRonda(r.Tipo)} ya está armada: no se puede cambiar entre partido único e ida y vuelta.");
            }
        }
        else
        {
            fase = new FaseEliminatoria { IdCampeonato = idCampeonato, CreatedAt = DateTime.UtcNow };
            _db.FasesEliminatorias.Add(fase);
        }

        fase.Modo = ModoEliminatoria.MANUAL;
        fase.EquiposClasifican = req.EquiposClasifican;
        fase.TercerPuesto = tercer;
        fase.ReglaTarjetas = regla;

        // Rondas: una por tipo de la fase; las que sobran (sin llaves) se quitan.
        foreach (var r in fase.Rondas.Where(r => !tipos.Contains(r.Tipo) && r.Llaves.Count == 0).ToList())
            _db.RondasEliminatorias.Remove(r);
        foreach (var t in tipos)
        {
            var r = fase.Rondas.FirstOrDefault(x => x.Tipo == t);
            if (r is null) { r = new RondaEliminatoria { Tipo = t }; fase.Rondas.Add(r); }
            var (iv, d, gv) = reglas.TryGetValue(t, out var n) ? n : (r.IdaYVuelta, r.Desempate, r.GolVisitante);
            if (r.Llaves.Count == 0) r.IdaYVuelta = iv;
            r.Desempate = d;
            r.GolVisitante = r.IdaYVuelta && gv;
        }
        await _db.SaveChangesAsync();
        return await ConsultarAsync(idCampeonato);
    }

    public async Task<ServiceResult> EliminarAsync(int idCampeonato)
    {
        if (!await _acceso.CampeonatoAsync(idCampeonato)) return ServiceResult.Fail("Campeonato no encontrado.");
        var fase = await CargarAsync(idCampeonato);
        if (fase is null) return ServiceResult.Ok();
        if (fase.Rondas.Any(r => r.Llaves.Count > 0))
            return ServiceResult.Fail("La fase ya tiene llaves armadas: elimine primero sus rondas.");
        _db.FasesEliminatorias.Remove(fase);
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    // ── Armar y eliminar rondas ──────────────────────────────────────────────

    private static bool LeerFecha(string? valor, out DateTime fecha)
        => DateTime.TryParseExact(valor, ["yyyy-MM-dd HH:mm", "yyyy-MM-ddTHH:mm"], null,
            System.Globalization.DateTimeStyles.None, out fecha);

    public async Task<ServiceResult<EliminatoriaDto>> CrearRondaAsync(int idCampeonato, string tipo, CrearRondaRequest req)
    {
        if (!await _acceso.CampeonatoAsync(idCampeonato)) return ServiceResult<EliminatoriaDto>.Fail("Campeonato no encontrado.");
        if (!Enum.TryParse<TipoRonda>(tipo, out var t)) return ServiceResult<EliminatoriaDto>.Fail("Ronda no válida.");
        var fase = await CargarAsync(idCampeonato);
        if (fase is null) return ServiceResult<EliminatoriaDto>.Fail("Configure primero la fase eliminatoria.");
        var actual = await ArmarDtoAsync(fase);
        var info = actual.Rondas.FirstOrDefault(r => r.Tipo == t.ToString());
        var ronda = fase.Rondas.FirstOrDefault(r => r.Tipo == t);
        if (info is null || ronda is null) return ServiceResult<EliminatoriaDto>.Fail($"{NombreRonda(t)} no es parte de esta fase.");
        if (info.Creada) return ServiceResult<EliminatoriaDto>.Fail($"{NombreRonda(t)} ya está armada.");
        if (!info.PuedeCrearse) return ServiceResult<EliminatoriaDto>.Fail("Primero deben tener ganador todas las llaves de la ronda anterior.");

        var llaves = req.Llaves ?? [];
        if (llaves.Count != info.TotalLlaves)
            return ServiceResult<EliminatoriaDto>.Fail($"{NombreRonda(t)} lleva {info.TotalLlaves} {(info.TotalLlaves == 1 ? "llave" : "llaves")}.");
        var ids = llaves.SelectMany(l => new[] { l.IdEquipoA, l.IdEquipoB }).ToList();
        if (ids.Any(id => id <= 0)) return ServiceResult<EliminatoriaDto>.Fail("Elija los dos equipos de cada llave.");
        if (ids.Distinct().Count() != ids.Count) return ServiceResult<EliminatoriaDto>.Fail("Un equipo no puede estar en dos llaves.");
        var inscritos = await _db.CampeonatoEquipos.Where(ce => ce.IdCampeonato == idCampeonato).Select(ce => ce.IdEquipo).ToListAsync();
        if (ids.Any(id => !inscritos.Contains(id))) return ServiceResult<EliminatoriaDto>.Fail("Hay equipos que no están inscritos en el campeonato.");
        if (info.Candidatos.Count > 0 && !ids.ToHashSet().SetEquals(info.Candidatos.Select(c => c.IdEquipo)))
            return ServiceResult<EliminatoriaDto>.Fail(t == TipoRonda.TERCER_PUESTO
                ? "El tercer puesto lo juegan los perdedores de las semifinales."
                : "Esta ronda la juegan los ganadores de la ronda anterior.");

        if (!LeerFecha(req.FechaIda, out var fechaIda))
            return ServiceResult<EliminatoriaDto>.Fail(ronda.IdaYVuelta ? "Elija la fecha y hora de la ida." : "Elija la fecha y hora del partido.");
        DateTime fechaVuelta = default;
        if (ronda.IdaYVuelta)
        {
            if (!LeerFecha(req.FechaVuelta, out fechaVuelta)) return ServiceResult<EliminatoriaDto>.Fail("Elija la fecha y hora de la vuelta.");
            if (fechaVuelta <= fechaIda) return ServiceResult<EliminatoriaDto>.Fail("La vuelta debe ser después de la ida.");
        }

        var nombre = NombreRonda(t);
        var instancia = await _db.CatalogoInstancias.FirstOrDefaultAsync(i => i.Nombre == nombre);
        if (instancia is null)
        {
            instancia = new CatalogoInstancia { Nombre = nombre };
            _db.CatalogoInstancias.Add(instancia);
        }

        await using var tx = await _db.Database.BeginTransactionAsync();
        var numero = (await _db.Jornadas.Where(j => j.IdCampeonato == idCampeonato).MaxAsync(j => (int?)j.Numero) ?? 0) + 1;
        var jIda = new Jornada { Numero = numero, IdCampeonato = idCampeonato, Instancia = instancia };
        _db.Jornadas.Add(jIda);
        Jornada? jVuelta = null;
        if (ronda.IdaYVuelta)
        {
            jVuelta = new Jornada { Numero = numero + 1, IdCampeonato = idCampeonato, Instancia = instancia };
            _db.Jornadas.Add(jVuelta);
        }

        var orden = 1;
        foreach (var lr in llaves)
        {
            var llave = new Llave { Orden = orden++, IdEquipoA = lr.IdEquipoA, IdEquipoB = lr.IdEquipoB };
            ronda.Llaves.Add(llave);
            llave.Partidos.Add(new Partido { Jornada = jIda, IdEquipoLocal = lr.IdEquipoA, IdEquipoVisitante = lr.IdEquipoB, Fecha = fechaIda });
            if (jVuelta is not null)
                llave.Partidos.Add(new Partido { Jornada = jVuelta, IdEquipoLocal = lr.IdEquipoB, IdEquipoVisitante = lr.IdEquipoA, Fecha = fechaVuelta });
        }
        await _db.SaveChangesAsync();
        await tx.CommitAsync();
        return await ConsultarAsync(idCampeonato);
    }

    public async Task<ServiceResult<EliminatoriaDto>> EliminarRondaAsync(int idCampeonato, string tipo)
    {
        if (!await _acceso.CampeonatoAsync(idCampeonato)) return ServiceResult<EliminatoriaDto>.Fail("Campeonato no encontrado.");
        if (!Enum.TryParse<TipoRonda>(tipo, out var t)) return ServiceResult<EliminatoriaDto>.Fail("Ronda no válida.");
        var fase = await CargarAsync(idCampeonato);
        var ronda = fase?.Rondas.FirstOrDefault(r => r.Tipo == t);
        if (fase is null || ronda is null || ronda.Llaves.Count == 0) return ServiceResult<EliminatoriaDto>.Fail($"{NombreRonda(t)} no está armada.");
        var info = (await ArmarDtoAsync(fase)).Rondas.First(r => r.Tipo == t.ToString());
        if (!info.PuedeEliminarse)
            return ServiceResult<EliminatoriaDto>.Fail("Solo se puede eliminar la última ronda armada y si ninguno de sus partidos empezó.");

        var partidos = ronda.Llaves.SelectMany(l => l.Partidos).ToList();
        var idsPartido = partidos.Select(p => p.IdPartido).ToList();
        var idsJornada = partidos.Select(p => p.IdJornada).Distinct().ToList();
        await using var tx = await _db.Database.BeginTransactionAsync();
        _db.EventosPartido.RemoveRange(_db.EventosPartido.Where(e => idsPartido.Contains(e.IdPartido)));
        _db.CambiosPartido.RemoveRange(_db.CambiosPartido.Where(c => idsPartido.Contains(c.IdPartido)));
        _db.Alineaciones.RemoveRange(_db.Alineaciones.Where(a => idsPartido.Contains(a.IdPartido)));
        _db.PartidosOficiales.RemoveRange(_db.PartidosOficiales.Where(o => idsPartido.Contains(o.IdPartido)));
        _db.Partidos.RemoveRange(partidos);
        _db.Llaves.RemoveRange(ronda.Llaves);
        await _db.SaveChangesAsync();
        // Jornadas de la ronda que quedaron vacías.
        var vacias = await _db.Jornadas.Where(j => idsJornada.Contains(j.IdJornada) && !j.Partidos.Any()).ToListAsync();
        _db.Jornadas.RemoveRange(vacias);
        await _db.SaveChangesAsync();
        await tx.CommitAsync();
        return await ConsultarAsync(idCampeonato);
    }

    // ── Penales de una llave empatada (organizador) ──────────────────────────

    public async Task<ServiceResult<EliminatoriaDto>> PenalesAsync(int idLlave, PenalesRequest req)
    {
        var llave = await _db.Llaves.Include(l => l.Ronda).ThenInclude(r => r.Fase)
            .Include(l => l.Partidos).ThenInclude(p => p.Jornada)
            .FirstOrDefaultAsync(l => l.IdLlave == idLlave);
        if (llave is null || !await _acceso.CampeonatoAsync(llave.Ronda.Fase.IdCampeonato))
            return ServiceResult<EliminatoriaDto>.Fail("Llave no encontrada.");
        var partidos = PartidosOrdenados(llave);
        var ultimo = partidos.LastOrDefault();
        if (ultimo is null) return ServiceResult<EliminatoriaDto>.Fail("La llave no tiene partidos.");

        if (req.PenalesA is null && req.PenalesB is null)
        {
            ultimo.PenalesLocal = ultimo.PenalesVisitante = null;
        }
        else
        {
            if (req.PenalesA is not int a || req.PenalesB is not int b || a < 0 || b < 0 || a > 99 || b > 99)
                return ServiceResult<EliminatoriaDto>.Fail("Escriba los penales convertidos por cada equipo.");
            if (a == b) return ServiceResult<EliminatoriaDto>.Fail("Los penales no pueden terminar empatados.");
            if (llave.Ronda.Desempate == DesempateRonda.MEJOR_UBICADO)
                return ServiceResult<EliminatoriaDto>.Fail("En esta ronda el empate lo define la tabla, no los penales.");
            if (partidos.Any(p => !p.Jugado) || partidos.Count < (llave.Ronda.IdaYVuelta ? 2 : 1))
                return ServiceResult<EliminatoriaDto>.Fail("Los penales se registran cuando la llave terminó.");
            var ga = partidos.Sum(p => GolesDe(p, llave.IdEquipoA) ?? 0);
            var gb = partidos.Sum(p => GolesDe(p, llave.IdEquipoB) ?? 0);
            var visA = partidos.Where(p => p.IdEquipoVisitante == llave.IdEquipoA).Sum(p => GolesDe(p, llave.IdEquipoA) ?? 0);
            var visB = partidos.Where(p => p.IdEquipoVisitante == llave.IdEquipoB).Sum(p => GolesDe(p, llave.IdEquipoB) ?? 0);
            if (ga != gb || (llave.Ronda.IdaYVuelta && llave.Ronda.GolVisitante && visA != visB))
                return ServiceResult<EliminatoriaDto>.Fail("La llave no terminó empatada: no hay penales.");
            var aEsLocal = ultimo.IdEquipoLocal == llave.IdEquipoA;
            ultimo.PenalesLocal = aEsLocal ? a : b;
            ultimo.PenalesVisitante = aEsLocal ? b : a;
        }
        await _db.SaveChangesAsync();
        return await ConsultarAsync(llave.Ronda.Fase.IdCampeonato);
    }
}
