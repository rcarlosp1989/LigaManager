namespace LigaManager.Infrastructure.Services;
using System.Globalization;
using LigaManager.Application.Common;
using LigaManager.Application.DTOs.Pagos;
using LigaManager.Domain.Entities;
using LigaManager.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

// Pagos de un campeonato.
//
// - Todos los cobros van a nombre del equipo (pago.id_equipo); el jugador, si lo hay, va en el
//   detalle. La base exige un solo destino por pago (trigger trg_pago_destino_*).
// - Cobros automáticos: inscripción de cada equipo, refuerzos (jugadores inscritos desde el
//   inicio de la segunda etapa), arbitraje de cada equipo por partido jugado y tarjetas. Se
//   generan al consultar los pagos (Sincronizar), una sola vez cada uno gracias a clave_auto, con
//   el valor vigente en ese momento: cambiar los valores no altera los cobros ya generados.
// - Si su origen desaparece (se borra la tarjeta, el partido vuelve a pendiente, el equipo sale
//   del campeonato) y el cobro no tiene abonos, se borra solo. Con abonos se conserva.
// - Doble amarilla: se cobra como una roja y sus amarillas no se cobran aparte.
// - Cobros manuales: multas, apelaciones y otros. Abonos: a un cobro o repartidos del más antiguo
//   al más nuevo; los que se registran juntos comparten lote (un recibo).
// - El organizador ve y opera todo; el dirigente solo consulta la cuenta de su equipo.
public class PagoService
{
    private static readonly string[] Codigos = ["INSCRIPCION", "REFUERZO", "ARBITRAJE", "AMARILLA", "ROJA", "MULTA", "APELACION", "OTRO"];
    private static readonly string[] Manuales = ["MULTA", "APELACION", "OTRO"];
    private const decimal MontoMaximo = 99_999_999.99m;

    private readonly LigaManagerContext _db;
    private readonly AccesoCampeonato   _acceso;
    public PagoService(LigaManagerContext db, AccesoCampeonato acceso) { _db = db; _acceso = acceso; }

    private static string Fecha(DateOnly d) => d.ToString("yyyy-MM-dd");
    private static string FechaCorta(DateOnly d) => d.ToString("dd/MM/yyyy");
    private static string Nombre(string? n, string? a) => $"{NombreCorto.PrimerNombre(n)} {NombreCorto.PrimerApellido(a)}".Trim();

    private static bool LeerFecha(string? s, out DateOnly d)
        => DateOnly.TryParseExact(s ?? "", "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out d);

    // ── Valores ──────────────────────────────────────────────────────────────

    private static ValoresDto Valores(CampeonatoTarifa? t) => t is null
        ? new ValoresDto(0, 0, 0, 0, 0, 0, null, false)
        : new ValoresDto(t.Inscripcion, t.Refuerzo, t.Apelacion, t.Arbitraje, t.Amarilla, t.Roja,
            t.InicioSegundaEtapa is DateOnly d ? Fecha(d) : null, true);

    public async Task<ServiceResult<ValoresDto>> GuardarValoresAsync(int idCampeonato, GuardarValoresRequest req)
    {
        if (!await _acceso.CampeonatoAsync(idCampeonato)) return ServiceResult<ValoresDto>.Fail("Campeonato no encontrado.");
        var montos = new[] { req.Inscripcion, req.Refuerzo, req.Apelacion, req.Arbitraje, req.Amarilla, req.Roja };
        if (montos.Any(m => m < 0 || m > MontoMaximo || decimal.Round(m, 2) != m))
            return ServiceResult<ValoresDto>.Fail("Revise los valores: deben ser 0 o más, con hasta dos decimales.");
        DateOnly? inicio = null;
        if (!string.IsNullOrWhiteSpace(req.InicioSegundaEtapa))
        {
            if (!LeerFecha(req.InicioSegundaEtapa, out var d)) return ServiceResult<ValoresDto>.Fail("La fecha de la segunda etapa no es válida.");
            inicio = d;
        }

        var t = await _db.CampeonatoTarifas.FirstOrDefaultAsync(x => x.IdCampeonato == idCampeonato);
        if (t is null) { t = new CampeonatoTarifa { IdCampeonato = idCampeonato }; _db.CampeonatoTarifas.Add(t); }
        t.Inscripcion = req.Inscripcion; t.Refuerzo = req.Refuerzo; t.Apelacion = req.Apelacion;
        t.Arbitraje = req.Arbitraje; t.Amarilla = req.Amarilla; t.Roja = req.Roja; t.InicioSegundaEtapa = inicio;
        await _db.SaveChangesAsync();
        return ServiceResult<ValoresDto>.Ok(Valores(t));
    }

    // ── Cobros automáticos ───────────────────────────────────────────────────

    private record Fuente(int IdEquipo, string Concepto, decimal Monto, DateOnly Fecha, string? Descripcion, int? IdPartido);

    private async Task<Dictionary<string, int>> ConceptosAsync()
        => await _db.ConceptosPago.Where(c => c.Codigo != null).ToDictionaryAsync(c => c.Codigo!, c => c.IdConcepto);

    private async Task SincronizarAsync(int idCampeonato)
    {
        var t = await _db.CampeonatoTarifas.AsNoTracking().FirstOrDefaultAsync(x => x.IdCampeonato == idCampeonato);
        if (t is null) return;
        var conceptos = await ConceptosAsync();
        if (Codigos.Any(c => !conceptos.ContainsKey(c))) return;
        var camp = await _db.Campeonatos.AsNoTracking().Where(c => c.IdCampeonato == idCampeonato)
            .Select(c => new { c.FechaInicio, c.FechaFin }).FirstAsync();

        var fuentes = new Dictionary<string, Fuente>();
        var pre = $"c{idCampeonato}:";

        var equipos = await _db.CampeonatoEquipos.Where(ce => ce.IdCampeonato == idCampeonato).Select(ce => ce.IdEquipo).ToListAsync();
        foreach (var e in equipos)
            fuentes[$"{pre}INS:{e}"] = new Fuente(e, "INSCRIPCION", t.Inscripcion, camp.FechaInicio, null, null);

        if (t.InicioSegundaEtapa is DateOnly ini)
        {
            var refuerzos = await _db.JugadorEquipos
                .Where(je => equipos.Contains(je.IdEquipo) && je.FechaDesde >= ini && je.FechaDesde <= camp.FechaFin)
                .Select(je => new { je.IdJugadorEquipo, je.IdEquipo, je.FechaDesde, je.Jugador.Persona.Nombre, je.Jugador.Persona.Apellido })
                .ToListAsync();
            foreach (var r in refuerzos)
                fuentes[$"{pre}REF:{r.IdJugadorEquipo}"] = new Fuente(r.IdEquipo, "REFUERZO", t.Refuerzo, r.FechaDesde,
                    $"{Nombre(r.Nombre, r.Apellido)} · inscrito el {FechaCorta(r.FechaDesde)}", null);
        }

        var partidos = await _db.Partidos
            .Where(p => p.Jornada.IdCampeonato == idCampeonato && p.Jugado && !p.Desierto)
            .Select(p => new { p.IdPartido, p.Fecha, p.Jornada.Numero, p.IdEquipoLocal, p.IdEquipoVisitante,
                Local = p.EquipoLocal.Nombre, Visitante = p.EquipoVisitante.Nombre })
            .ToListAsync();
        foreach (var p in partidos)
        {
            var dia = DateOnly.FromDateTime(p.Fecha);
            fuentes[$"{pre}ARB:{p.IdPartido}:{p.IdEquipoLocal}"] = new Fuente(p.IdEquipoLocal, "ARBITRAJE", t.Arbitraje, dia,
                $"Jornada {p.Numero} · vs {p.Visitante}", p.IdPartido);
            fuentes[$"{pre}ARB:{p.IdPartido}:{p.IdEquipoVisitante}"] = new Fuente(p.IdEquipoVisitante, "ARBITRAJE", t.Arbitraje, dia,
                $"Jornada {p.Numero} · vs {p.Local}", p.IdPartido);
        }

        var eventos = await _db.EventosPartido
            .Where(e => e.Partido.Jornada.IdCampeonato == idCampeonato && e.Partido.Jugado
                && (e.TipoEvento == "TARJETA_AMARILLA" || e.TipoEvento == "TARJETA_ROJA"))
            .Select(e => new { e.IdEvento, e.IdPartido, e.IdJugador, e.TipoEvento, e.Minuto,
                e.Partido.Fecha, e.Partido.Jornada.Numero, e.Partido.IdEquipoLocal, e.Partido.IdEquipoVisitante,
                e.Jugador.Persona.Nombre, e.Jugador.Persona.Apellido })
            .ToListAsync();
        var idsJugadores = eventos.Select(e => e.IdJugador).Distinct().ToList();
        var vinculos = await _db.JugadorEquipos
            .Where(je => idsJugadores.Contains(je.IdJugador) && equipos.Contains(je.IdEquipo))
            .Select(je => new { je.IdJugador, je.IdEquipo }).Distinct().ToListAsync();

        foreach (var g in eventos.GroupBy(e => (e.IdPartido, e.IdJugador)))
        {
            var x = g.First();
            var equipo = vinculos.FirstOrDefault(v => v.IdJugador == x.IdJugador && (v.IdEquipo == x.IdEquipoLocal || v.IdEquipo == x.IdEquipoVisitante));
            if (equipo is null) continue;
            var dia = DateOnly.FromDateTime(x.Fecha);
            var quien = $"Jornada {x.Numero} · {Nombre(x.Nombre, x.Apellido)}";
            var amarillas = g.Where(e => e.TipoEvento == "TARJETA_AMARILLA").ToList();
            var rojas     = g.Where(e => e.TipoEvento == "TARJETA_ROJA").ToList();
            if (rojas.Count == 0 && amarillas.Count >= 2)
            {
                fuentes[$"{pre}DOB:{x.IdPartido}:{x.IdJugador}"] = new Fuente(equipo.IdEquipo, "ROJA", t.Roja, dia,
                    $"{quien}, doble amarilla", x.IdPartido);
                continue;
            }
            foreach (var a in amarillas)
                fuentes[$"{pre}AMA:{a.IdEvento}"] = new Fuente(equipo.IdEquipo, "AMARILLA", t.Amarilla, dia, $"{quien}, min {a.Minuto}", x.IdPartido);
            foreach (var r in rojas)
                fuentes[$"{pre}ROJ:{r.IdEvento}"] = new Fuente(equipo.IdEquipo, "ROJA", t.Roja, dia, $"{quien}, roja directa, min {r.Minuto}", x.IdPartido);
        }

        var existentes = await _db.Pagos.Where(p => p.IdCampeonato == idCampeonato && p.ClaveAuto != null)
            .Select(p => new { Pago = p, ConAbonos = p.Abonos.Any() }).ToListAsync();
        var claves = new HashSet<string>();
        foreach (var e in existentes)
        {
            claves.Add(e.Pago.ClaveAuto!);
            if (!fuentes.TryGetValue(e.Pago.ClaveAuto!, out var f))
            {
                if (!e.ConAbonos) _db.Pagos.Remove(e.Pago);
                continue;
            }
            if (e.Pago.Descripcion != f.Descripcion) e.Pago.Descripcion = f.Descripcion;
            if (!e.ConAbonos && e.Pago.IdEquipo != f.IdEquipo) e.Pago.IdEquipo = f.IdEquipo;
        }
        foreach (var (clave, f) in fuentes)
        {
            if (claves.Contains(clave) || f.Monto <= 0) continue;
            _db.Pagos.Add(new Pago
            {
                IdCampeonato = idCampeonato, IdEquipo = f.IdEquipo, IdConcepto = conceptos[f.Concepto],
                Monto = f.Monto, Fecha = f.Fecha, Descripcion = f.Descripcion, IdPartido = f.IdPartido,
                ClaveAuto = clave, CreatedAt = DateTime.UtcNow,
            });
        }

        try { await _db.SaveChangesAsync(); }
        catch (DbUpdateException) { _db.ChangeTracker.Clear(); }   // otra consulta simultánea ya los generó
    }

    // ── Consultas ────────────────────────────────────────────────────────────

    private record Fila(int IdPago, int IdEquipo, DateOnly Fecha, string Codigo, string ConceptoNombre, string? Descripcion,
        decimal Monto, decimal Abonado, bool Automatico);

    private async Task<List<Fila>> FilasAsync(int idCampeonato, int? idEquipo = null)
    {
        var q = _db.Pagos.Where(p => p.IdCampeonato == idCampeonato && p.IdEquipo != null);
        if (idEquipo is int e) q = q.Where(p => p.IdEquipo == e);
        var filas = await q.Select(p => new
            {
                p.IdPago, IdEquipo = p.IdEquipo!.Value, p.Fecha, p.Concepto.Codigo, p.Concepto.Descripcion, Detalle = p.Descripcion,
                p.Monto, Abonado = p.Abonos.Sum(a => (decimal?)a.Monto) ?? 0, Auto = p.ClaveAuto != null,
            })
            .ToListAsync();
        return filas.Select(f => new Fila(f.IdPago, f.IdEquipo, f.Fecha, f.Codigo ?? "OTRO", f.Descripcion, f.Detalle, f.Monto, f.Abonado, f.Auto))
            .OrderBy(f => f.Fecha).ThenBy(f => f.IdPago).ToList();
    }

    public async Task<ServiceResult<ResumenPagosDto>> ResumenAsync(int idCampeonato)
    {
        if (!await _acceso.CampeonatoAsync(idCampeonato)) return ServiceResult<ResumenPagosDto>.Fail("Campeonato no encontrado.");
        await SincronizarAsync(idCampeonato);
        var tarifa = await _db.CampeonatoTarifas.AsNoTracking().FirstOrDefaultAsync(x => x.IdCampeonato == idCampeonato);
        var filas = await FilasAsync(idCampeonato);
        var equipos = await _db.CampeonatoEquipos.Where(ce => ce.IdCampeonato == idCampeonato)
            .Select(ce => new { ce.IdEquipo, ce.Equipo.Nombre, ce.Equipo.LogoUrl }).ToListAsync();
        // Equipos que ya no están en el campeonato pero tienen cobros con abonos.
        var ids = equipos.Select(e => e.IdEquipo).ToHashSet();
        var otros = filas.Select(f => f.IdEquipo).Where(i => !ids.Contains(i)).Distinct().ToList();
        if (otros.Count > 0)
            equipos.AddRange(await _db.Equipos.Where(e => otros.Contains(e.IdEquipo))
                .Select(e => new { e.IdEquipo, e.Nombre, e.LogoUrl }).ToListAsync());

        decimal Suma(IEnumerable<Fila> f, params string[] c) => f.Where(x => c.Contains(x.Codigo)).Sum(x => x.Monto);
        var resumen = equipos.OrderBy(e => e.Nombre).Select(e =>
        {
            var f = filas.Where(x => x.IdEquipo == e.IdEquipo).ToList();
            var total = f.Sum(x => x.Monto); var pagado = f.Sum(x => x.Abonado);
            return new ResumenEquipoPagosDto(e.IdEquipo, e.Nombre, e.LogoUrl,
                Suma(f, "INSCRIPCION"), Suma(f, "REFUERZO"), Suma(f, "ARBITRAJE"), Suma(f, "AMARILLA", "ROJA"),
                Suma(f, "MULTA", "APELACION", "OTRO"), total, pagado, total - pagado);
        }).ToList();
        var t = resumen.Sum(r => r.Total); var p = resumen.Sum(r => r.Pagado);
        return ServiceResult<ResumenPagosDto>.Ok(new ResumenPagosDto(Valores(tarifa), resumen, t, p, t - p));
    }

    private async Task<ServiceResult<EstadoCuentaDto>> CuentaAsync(int idCampeonato, int idEquipo)
    {
        await SincronizarAsync(idCampeonato);
        var equipo = await _db.Equipos.Where(e => e.IdEquipo == idEquipo).Select(e => new { e.Nombre, e.LogoUrl }).FirstOrDefaultAsync();
        var campeonato = await _db.Campeonatos.Where(c => c.IdCampeonato == idCampeonato).Select(c => c.Nombre).FirstOrDefaultAsync();
        if (equipo is null || campeonato is null) return ServiceResult<EstadoCuentaDto>.Fail("Equipo no encontrado.");
        var filas = await FilasAsync(idCampeonato, idEquipo);
        var inscrito = await _db.CampeonatoEquipos.AnyAsync(ce => ce.IdCampeonato == idCampeonato && ce.IdEquipo == idEquipo);
        if (!inscrito && filas.Count == 0) return ServiceResult<EstadoCuentaDto>.Fail("Equipo no encontrado.");

        var cobros = filas.Select(f => new CobroDto(f.IdPago, Fecha(f.Fecha), f.Codigo, f.ConceptoNombre, f.Descripcion,
            f.Monto, f.Abonado, f.Monto - f.Abonado, f.Automatico)).ToList();
        var nombres = filas.ToDictionary(f => f.IdPago, f => f.Descripcion is null ? f.ConceptoNombre : $"{f.ConceptoNombre} · {f.Descripcion}");
        var idsPago = filas.Select(f => f.IdPago).ToList();
        var abonos = await _db.Abonos.Where(a => idsPago.Contains(a.IdPago)).OrderBy(a => a.IdAbono).ToListAsync();
        var lista = abonos.GroupBy(a => a.Lote ?? $"a{a.IdAbono}")
            .Select(g => new AbonoDto(g.Key, Fecha(g.First().Fecha), g.First().Metodo.ToString(), g.First().Referencia,
                g.Sum(a => a.Monto), g.Select(a => nombres[a.IdPago]).ToList()))
            .OrderByDescending(a => a.Fecha).ThenByDescending(a => abonos.First(x => (x.Lote ?? $"a{x.IdAbono}") == a.Lote).IdAbono)
            .ToList();
        var total = filas.Sum(f => f.Monto); var pagado = filas.Sum(f => f.Abonado);
        return ServiceResult<EstadoCuentaDto>.Ok(new EstadoCuentaDto(idEquipo, equipo.Nombre, equipo.LogoUrl, campeonato,
            cobros, lista, total, pagado, total - pagado));
    }

    public async Task<ServiceResult<EstadoCuentaDto>> CuentaOrganizadorAsync(int idCampeonato, int idEquipo)
        => await _acceso.CampeonatoAsync(idCampeonato)
            ? await CuentaAsync(idCampeonato, idEquipo)
            : ServiceResult<EstadoCuentaDto>.Fail("Campeonato no encontrado.");

    // Dirigente: solo la cuenta de su equipo.
    public async Task<ServiceResult<EstadoCuentaDto>> CuentaDirigenteAsync(int idCampeonato)
        => await _acceso.EquipoDelDirigenteAsync(idCampeonato) is int idEquipo
            ? await CuentaAsync(idCampeonato, idEquipo)
            : ServiceResult<EstadoCuentaDto>.Fail("Campeonato no encontrado.");

    // ── Cobros manuales ──────────────────────────────────────────────────────

    public async Task<ServiceResult<EstadoCuentaDto>> CobroManualAsync(int idCampeonato, CobroManualRequest req)
    {
        if (!await _acceso.CampeonatoAsync(idCampeonato)) return ServiceResult<EstadoCuentaDto>.Fail("Campeonato no encontrado.");
        var concepto = (req.Concepto ?? "").Trim().ToUpperInvariant();
        if (!Manuales.Contains(concepto)) return ServiceResult<EstadoCuentaDto>.Fail("Elija multa, apelación u otro.");
        if (!await _db.CampeonatoEquipos.AnyAsync(ce => ce.IdCampeonato == idCampeonato && ce.IdEquipo == req.IdEquipo))
            return ServiceResult<EstadoCuentaDto>.Fail("Elija un equipo inscrito en este campeonato.");
        if (!LeerFecha(req.Fecha, out var fecha)) return ServiceResult<EstadoCuentaDto>.Fail("La fecha no es válida.");
        var descripcion = string.IsNullOrWhiteSpace(req.Descripcion) ? null : req.Descripcion.Trim();
        if (descripcion is { Length: > 200 }) return ServiceResult<EstadoCuentaDto>.Fail("El detalle admite hasta 200 caracteres.");
        if (concepto != "APELACION" && descripcion is null) return ServiceResult<EstadoCuentaDto>.Fail("Indique el motivo del cobro.");

        var monto = req.Monto;
        if (monto is null && concepto == "APELACION")
            monto = await _db.CampeonatoTarifas.Where(x => x.IdCampeonato == idCampeonato).Select(x => (decimal?)x.Apelacion).FirstOrDefaultAsync();
        if (monto is not decimal m || m <= 0 || m > MontoMaximo || decimal.Round(m, 2) != m)
            return ServiceResult<EstadoCuentaDto>.Fail("Indique un valor mayor a 0, con hasta dos decimales.");

        var conceptos = await ConceptosAsync();
        if (!conceptos.TryGetValue(concepto, out var idConcepto)) return ServiceResult<EstadoCuentaDto>.Fail("Falta ejecutar el script de pagos en la base.");
        _db.Pagos.Add(new Pago
        {
            IdCampeonato = idCampeonato, IdEquipo = req.IdEquipo, IdConcepto = idConcepto, Monto = m, Fecha = fecha,
            Descripcion = descripcion, CreatedAt = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();
        return await CuentaAsync(idCampeonato, req.IdEquipo);
    }

    public async Task<ServiceResult<EstadoCuentaDto>> EliminarCobroAsync(int idCampeonato, int idPago)
    {
        if (!await _acceso.CampeonatoAsync(idCampeonato)) return ServiceResult<EstadoCuentaDto>.Fail("Campeonato no encontrado.");
        var pago = await _db.Pagos.Include(p => p.Abonos).FirstOrDefaultAsync(p => p.IdPago == idPago && p.IdCampeonato == idCampeonato);
        if (pago?.IdEquipo is not int idEquipo) return ServiceResult<EstadoCuentaDto>.Fail("Cobro no encontrado.");
        if (pago.ClaveAuto is not null) return ServiceResult<EstadoCuentaDto>.Fail("Este cobro lo genera el sistema; no se puede eliminar.");
        if (pago.Abonos.Count > 0) return ServiceResult<EstadoCuentaDto>.Fail("El cobro tiene abonos: elimine primero los abonos.");
        _db.Pagos.Remove(pago);
        await _db.SaveChangesAsync();
        return await CuentaAsync(idCampeonato, idEquipo);
    }

    // ── Abonos ───────────────────────────────────────────────────────────────

    public async Task<ServiceResult<EstadoCuentaDto>> AbonarAsync(int idCampeonato, int idEquipo, AbonoRequest req)
    {
        if (!await _acceso.CampeonatoAsync(idCampeonato)) return ServiceResult<EstadoCuentaDto>.Fail("Campeonato no encontrado.");
        if (req.Monto <= 0 || req.Monto > MontoMaximo || decimal.Round(req.Monto, 2) != req.Monto)
            return ServiceResult<EstadoCuentaDto>.Fail("Indique un monto mayor a 0, con hasta dos decimales.");
        if (!LeerFecha(req.Fecha, out var fecha)) return ServiceResult<EstadoCuentaDto>.Fail("La fecha no es válida.");
        if (!Enum.TryParse<MetodoAbono>((req.Metodo ?? "").Trim().ToUpperInvariant(), out var metodo) || !Enum.IsDefined(metodo))
            return ServiceResult<EstadoCuentaDto>.Fail("Elija el método de pago.");
        var referencia = string.IsNullOrWhiteSpace(req.Referencia) ? null : req.Referencia.Trim();
        if (referencia is { Length: > 100 }) return ServiceResult<EstadoCuentaDto>.Fail("La referencia admite hasta 100 caracteres.");

        await SincronizarAsync(idCampeonato);
        var pendientes = (await FilasAsync(idCampeonato, idEquipo)).Where(f => f.Monto > f.Abonado).ToList();
        if (req.IdPago is int idPago) pendientes = pendientes.Where(f => f.IdPago == idPago).ToList();
        var saldo = pendientes.Sum(f => f.Monto - f.Abonado);
        if (saldo <= 0) return ServiceResult<EstadoCuentaDto>.Fail(req.IdPago is null ? "El equipo no tiene saldo pendiente." : "Ese cobro no tiene saldo pendiente.");
        if (req.Monto > saldo) return ServiceResult<EstadoCuentaDto>.Fail($"El monto supera el saldo pendiente (${saldo.ToString("0.00", CultureInfo.InvariantCulture)}).");

        var lote = Guid.NewGuid().ToString("N");
        var resta = req.Monto;
        foreach (var f in pendientes)
        {
            if (resta <= 0) break;
            var parte = Math.Min(resta, f.Monto - f.Abonado);
            _db.Abonos.Add(new Abono { IdPago = f.IdPago, Monto = parte, Fecha = fecha, Metodo = metodo, Referencia = referencia, Lote = lote, CreatedAt = DateTime.UtcNow });
            resta -= parte;
        }
        await _db.SaveChangesAsync();
        return await CuentaAsync(idCampeonato, idEquipo);
    }

    public async Task<ServiceResult<EstadoCuentaDto>> EliminarAbonoAsync(int idCampeonato, string lote)
    {
        if (!await _acceso.CampeonatoAsync(idCampeonato)) return ServiceResult<EstadoCuentaDto>.Fail("Campeonato no encontrado.");
        var q = _db.Abonos.Where(a => a.Pago.IdCampeonato == idCampeonato);
        q = lote.StartsWith('a') && int.TryParse(lote[1..], out var idAbono)
            ? q.Where(a => a.IdAbono == idAbono && a.Lote == null)
            : q.Where(a => a.Lote == lote);
        var abonos = await q.Include(a => a.Pago).ToListAsync();
        if (abonos.Count == 0 || abonos[0].Pago.IdEquipo is not int idEquipo) return ServiceResult<EstadoCuentaDto>.Fail("Abono no encontrado.");
        _db.Abonos.RemoveRange(abonos);
        await _db.SaveChangesAsync();
        return await CuentaAsync(idCampeonato, idEquipo);
    }

    // ── Al eliminar un campeonato o un equipo ────────────────────────────────

    // Borra los cobros sin abonos (los automáticos se generan solos). Devuelve false si hay abonos.
    public static async Task<bool> LiberarCobrosAsync(LigaManagerContext db, int? idCampeonato = null, int? idEquipo = null)
    {
        var q = db.Pagos.AsQueryable();
        if (idCampeonato is int c) q = q.Where(p => p.IdCampeonato == c);
        if (idEquipo is int e) q = q.Where(p => p.IdEquipo == e);
        if (await q.AnyAsync(p => p.Abonos.Any())) return false;
        db.Pagos.RemoveRange(await q.ToListAsync());
        return true;
    }
}
