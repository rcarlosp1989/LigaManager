namespace LigaManager.Infrastructure.Services;
using LigaManager.Application.DTOs.Grupos;
using LigaManager.Application.Common;
using LigaManager.Application.Interfaces;
using LigaManager.Domain.Entities;
using LigaManager.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

public class GrupoService : IGrupoService
{
    private readonly LigaManagerContext _db;
    private readonly AccesoCampeonato _acceso;
    public GrupoService(LigaManagerContext db, AccesoCampeonato acceso) { _db = db; _acceso = acceso; }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private async Task<GrupoDetalleDto> ToDetalleAsync(int idGrupo, int? equiposClasifican = null)
    {
        var g = await _db.Grupos
            .Include(g => g.Equipos).ThenInclude(ge => ge.Equipo).ThenInclude(e => e.Pais)
            .Include(g => g.Posiciones).ThenInclude(p => p.Equipo)
            .FirstOrDefaultAsync(g => g.IdGrupo == idGrupo);

        if (g is null) return null!;

        // Si no se pasa equiposClasifican, buscar en la fase
        if (equiposClasifican is null)
        {
            var fase = await _db.FasesCampeonato
                .Where(f => f.IdCampeonato == g.IdCampeonato)
                .OrderBy(f => f.Orden)
                .FirstOrDefaultAsync();
            equiposClasifican = fase?.EquiposClasifican ?? 2;
        }

        var equipos = g.Equipos.Select(ge => new EquipoGrupoDto(
            ge.IdEquipo, ge.Equipo.Nombre, ge.Equipo.Pais.Nombre
        )).ToList();

        var posiciones = g.Posiciones
            .OrderByDescending(p => p.Pts)
            .ThenByDescending(p => p.Pg)
            .ThenByDescending(p => p.Gf - p.Gc)
            .ThenByDescending(p => p.Gf)
            .Select((p, i) => new PosicionGrupoDto(
                i + 1,
                p.IdEquipo,
                p.Equipo.Nombre,
                p.Pj, p.Pg, p.Pe, p.Pp,
                p.Gf, p.Gc,
                p.Gf - p.Gc,
                p.Pts,
                i < equiposClasifican
            )).ToList();

        return new GrupoDetalleDto(g.IdGrupo, g.Nombre, g.IdCampeonato, equipos, posiciones);
    }

    // ── CRUD Grupos ───────────────────────────────────────────────────────────

    public async Task<List<GrupoListDto>> GetByCampeonatoAsync(int idCampeonato)
        => !await _acceso.CampeonatoAsync(idCampeonato) ? [] : await _db.Grupos
            .Where(g => g.IdCampeonato == idCampeonato)
            .Include(g => g.Equipos)
            .OrderBy(g => g.Nombre)
            .Select(g => new GrupoListDto(g.IdGrupo, g.Nombre, g.IdCampeonato, g.Equipos.Count))
            .ToListAsync();

    public async Task<List<PosicionGrupoDto>> GetPosicionesCampeonatoAsync(int idCampeonato)
    {
        if (!await _acceso.CampeonatoAsync(idCampeonato)) return [];
        var equipos = await _db.CampeonatoEquipos
            .Where(ce => ce.IdCampeonato == idCampeonato)
            .Include(ce => ce.Equipo)
            .ToListAsync();
        var partidos = await _db.Partidos
            .Where(p => p.Jornada.IdCampeonato == idCampeonato && p.Jugado)
            .ToListAsync();

        var posiciones = equipos.ToDictionary(
            ce => ce.IdEquipo,
            ce => new PosicionGrupo { IdGrupo = 0, IdEquipo = ce.IdEquipo });

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

        return posiciones.Values
            .Join(equipos, p => p.IdEquipo, ce => ce.IdEquipo, (p, ce) => new { p, ce.Equipo.Nombre })
            .OrderByDescending(x => x.p.Pts)
            .ThenByDescending(x => x.p.Pg)
            .ThenByDescending(x => x.p.Gf - x.p.Gc)
            .ThenByDescending(x => x.p.Gf)
            .Select((x, i) => new PosicionGrupoDto(
                i + 1, x.p.IdEquipo, x.Nombre, x.p.Pj, x.p.Pg, x.p.Pe, x.p.Pp,
                x.p.Gf, x.p.Gc, x.p.Gf - x.p.Gc, x.p.Pts, false))
            .ToList();
    }

    public async Task<ServiceResult<GrupoDetalleDto>> GetByIdAsync(int id)
    {
        if (!await _acceso.GrupoAsync(id)) return ServiceResult<GrupoDetalleDto>.Fail("Grupo no encontrado.");
        var detalle = await ToDetalleAsync(id);
        if (detalle is null) return ServiceResult<GrupoDetalleDto>.Fail("Grupo no encontrado.");
        return ServiceResult<GrupoDetalleDto>.Ok(detalle);
    }

    public async Task<ServiceResult<GrupoListDto>> CreateAsync(int idCampeonato, CreateGrupoRequest req)
    {
        if (!await _acceso.CampeonatoAsync(idCampeonato)) return ServiceResult<GrupoListDto>.Fail("Campeonato no encontrado.");
        var campeonatoExiste = await _db.Campeonatos.AnyAsync(c => c.IdCampeonato == idCampeonato);
        if (!campeonatoExiste)
            return ServiceResult<GrupoListDto>.Fail("Campeonato no encontrado.");

        var nombreExiste = await _db.Grupos
            .AnyAsync(g => g.IdCampeonato == idCampeonato &&
                           g.Nombre.ToLower() == req.Nombre.Trim().ToLower());
        if (nombreExiste)
            return ServiceResult<GrupoListDto>.Fail($"Ya existe el Grupo '{req.Nombre}' en este campeonato.");

        var grupo = new Grupo { Nombre = req.Nombre.Trim(), IdCampeonato = idCampeonato };
        _db.Grupos.Add(grupo);
        await _db.SaveChangesAsync();

        return ServiceResult<GrupoListDto>.Ok(new GrupoListDto(grupo.IdGrupo, grupo.Nombre, grupo.IdCampeonato, 0));
    }

    public async Task<ServiceResult<GrupoListDto>> UpdateAsync(int id, UpdateGrupoRequest req)
    {
        if (!await _acceso.GrupoAsync(id)) return ServiceResult<GrupoListDto>.Fail("Grupo no encontrado.");
        var grupo = await _db.Grupos.Include(g => g.Equipos).FirstOrDefaultAsync(g => g.IdGrupo == id);
        if (grupo is null) return ServiceResult<GrupoListDto>.Fail("Grupo no encontrado.");

        grupo.Nombre = req.Nombre.Trim();
        await _db.SaveChangesAsync();

        return ServiceResult<GrupoListDto>.Ok(new GrupoListDto(grupo.IdGrupo, grupo.Nombre, grupo.IdCampeonato, grupo.Equipos.Count));
    }

    public async Task<ServiceResult> DeleteAsync(int id)
    {
        if (!await _acceso.GrupoAsync(id)) return ServiceResult.Fail("Grupo no encontrado.");
        var grupo = await _db.Grupos.Include(g => g.Jornadas).FirstOrDefaultAsync(g => g.IdGrupo == id);
        if (grupo is null) return ServiceResult.Fail("Grupo no encontrado.");
        if (grupo.Jornadas.Any()) return ServiceResult.Fail("No se puede eliminar: el grupo tiene jornadas asignadas.");

        _db.Grupos.Remove(grupo);
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    // ── Equipos en grupo ─────────────────────────────────────────────────────

    public async Task<ServiceResult<GrupoDetalleDto>> AsignarEquipoAsync(int idGrupo, int idEquipo)
    {
        if (!await _acceso.GrupoAsync(idGrupo)) return ServiceResult<GrupoDetalleDto>.Fail("Grupo no encontrado.");
        var grupo = await _db.Grupos.FirstOrDefaultAsync(g => g.IdGrupo == idGrupo);
        if (grupo is null) return ServiceResult<GrupoDetalleDto>.Fail("Grupo no encontrado.");

        // Verificar que el equipo esté inscrito en el campeonato
        var inscrito = await _db.CampeonatoEquipos
            .AnyAsync(ce => ce.IdCampeonato == grupo.IdCampeonato && ce.IdEquipo == idEquipo);
        if (!inscrito)
            return ServiceResult<GrupoDetalleDto>.Fail("El equipo no está inscrito en este campeonato.");

        // Verificar que no esté ya en otro grupo del mismo campeonato
        var enOtroGrupo = await _db.GrupoEquipos
            .Include(ge => ge.Grupo)
            .AnyAsync(ge => ge.Grupo.IdCampeonato == grupo.IdCampeonato && ge.IdEquipo == idEquipo);
        if (enOtroGrupo)
            return ServiceResult<GrupoDetalleDto>.Fail("El equipo ya está asignado a un grupo de este campeonato.");

        _db.GrupoEquipos.Add(new GrupoEquipo { IdGrupo = idGrupo, IdEquipo = idEquipo });
        await _db.SaveChangesAsync();

        return ServiceResult<GrupoDetalleDto>.Ok(await ToDetalleAsync(idGrupo));
    }

    public async Task<ServiceResult<GrupoDetalleDto>> RemoverEquipoAsync(int idGrupo, int idEquipo)
    {
        if (!await _acceso.GrupoAsync(idGrupo)) return ServiceResult<GrupoDetalleDto>.Fail("Grupo no encontrado.");
        var ge = await _db.GrupoEquipos
            .FirstOrDefaultAsync(ge => ge.IdGrupo == idGrupo && ge.IdEquipo == idEquipo);
        if (ge is null) return ServiceResult<GrupoDetalleDto>.Fail("El equipo no está en este grupo.");

        _db.GrupoEquipos.Remove(ge);

        // También eliminar su posición si existe
        var pos = await _db.PosicionesGrupo
            .FirstOrDefaultAsync(p => p.IdGrupo == idGrupo && p.IdEquipo == idEquipo);
        if (pos is not null) _db.PosicionesGrupo.Remove(pos);

        await _db.SaveChangesAsync();
        return ServiceResult<GrupoDetalleDto>.Ok(await ToDetalleAsync(idGrupo));
    }

    // ── Calendario automático (todos contra todos) ───────────────────────────

    public async Task<ServiceResult<string>> GenerarCalendarioAsync(int idGrupo, GenerarCalendarioRequest req)
    {
        if (!await _acceso.GrupoAsync(idGrupo)) return ServiceResult<string>.Fail("Grupo no encontrado.");
        var grupo = await _db.Grupos
            .Include(g => g.Equipos)
            .Include(g => g.Jornadas)
            .Include(g => g.Campeonato)
            .FirstOrDefaultAsync(g => g.IdGrupo == idGrupo);

        if (grupo is null) return ServiceResult<string>.Fail("Grupo no encontrado.");
        if (grupo.Equipos.Count < 2) return ServiceResult<string>.Fail("El grupo debe tener al menos 2 equipos.");
        if (grupo.Jornadas.Any()) return ServiceResult<string>.Fail("El grupo ya tiene jornadas creadas. Elimínalas primero.");

        var equipoIds = grupo.Equipos.Select(ge => ge.IdEquipo).ToList();
        return await GenerarCalendarioInternoAsync(grupo.Campeonato, idGrupo, equipoIds, req);
    }

    public async Task<ServiceResult<string>> GenerarCalendarioCampeonatoAsync(int idCampeonato, GenerarCalendarioRequest req)
    {
        if (!await _acceso.CampeonatoAsync(idCampeonato)) return ServiceResult<string>.Fail("Campeonato no encontrado.");
        var campeonato = await _db.Campeonatos
            .Include(c => c.Equipos)
            .Include(c => c.Grupos)
            .FirstOrDefaultAsync(c => c.IdCampeonato == idCampeonato);

        if (campeonato is null) return ServiceResult<string>.Fail("Campeonato no encontrado.");
        if (campeonato.Grupos.Any())
            return ServiceResult<string>.Fail("Este campeonato usa grupos: genera el calendario desde la pestaña Grupos.");
        if (campeonato.Equipos.Count < 2)
            return ServiceResult<string>.Fail("El campeonato debe tener al menos 2 equipos inscritos.");

        var yaTieneJornadas = await _db.Jornadas.AnyAsync(j => j.IdCampeonato == idCampeonato);
        if (yaTieneJornadas)
            return ServiceResult<string>.Fail("El campeonato ya tiene jornadas creadas. Elimínalas primero.");

        var equipoIds = campeonato.Equipos.Select(ce => ce.IdEquipo).ToList();
        return await GenerarCalendarioInternoAsync(campeonato, null, equipoIds, req);
    }

    private async Task<ServiceResult<string>> GenerarCalendarioInternoAsync(
        Campeonato campeonato, int? idGrupo, List<int> equipoIdsOriginal, GenerarCalendarioRequest req)
    {
        if (!DateTime.TryParse(req.FechaInicio, out var fechaInicio))
            return ServiceResult<string>.Fail("Formato de fecha inválido. Use yyyy-MM-dd.");

        var instanciaExiste = await _db.CatalogoInstancias.AnyAsync(i => i.IdInstancia == req.IdInstancia);
        if (!instanciaExiste) return ServiceResult<string>.Fail("Instancia no válida.");

        var equipos = new List<int>(equipoIdsOriginal);
        int n = equipos.Count;
        if (n % 2 != 0) equipos.Add(-1); // bye si número impar
        int totalRondas = equipos.Count - 1;
        int mitad = equipos.Count / 2;

        // Genera una vuelta o dos (ida y vuelta)
        int vueltas = req.IdaYVuelta ? 2 : 1;

        var fechaUltimaJornada = fechaInicio.AddDays((vueltas * totalRondas - 1) * req.DiasEntreJornadas);
        var fechaInicioOnly = DateOnly.FromDateTime(fechaInicio);
        var fechaUltimaOnly = DateOnly.FromDateTime(fechaUltimaJornada);
        if (fechaInicioOnly < campeonato.FechaInicio || fechaUltimaOnly > campeonato.FechaFin)
            return ServiceResult<string>.Fail(
                $"Las fechas del calendario ({fechaInicioOnly:dd/MM/yyyy} a {fechaUltimaOnly:dd/MM/yyyy}) deben estar dentro del rango del campeonato ({campeonato.FechaInicio:dd/MM/yyyy} a {campeonato.FechaFin:dd/MM/yyyy}).");

        int totalPartidos = 0;

        for (int vuelta = 0; vuelta < vueltas; vuelta++)
        {
            var equiposVuelta = new List<int>(equipos); // copia para rotar independiente

            for (int ronda = 0; ronda < totalRondas; ronda++)
            {
                var fechaJornada = fechaInicio.AddDays((vuelta * totalRondas + ronda) * req.DiasEntreJornadas);
                int numeroJornada = await _db.Jornadas
                    .Where(j => j.IdCampeonato == campeonato.IdCampeonato)
                    .MaxAsync(j => (int?)j.Numero) ?? 0;
                numeroJornada++;

                var jornada = new Jornada
                {
                    Numero       = numeroJornada,
                    IdCampeonato = campeonato.IdCampeonato,
                    IdInstancia  = req.IdInstancia,
                    IdGrupo      = idGrupo,
                };
                _db.Jornadas.Add(jornada);
                await _db.SaveChangesAsync();

                for (int i = 0; i < mitad; i++)
                {
                    int equipoA = equiposVuelta[i];
                    int equipoB = equiposVuelta[equiposVuelta.Count - 1 - i];

                    if (equipoA == -1 || equipoB == -1) continue;

                    // En la segunda vuelta invertir local/visitante
                    int local     = vuelta == 0 ? equipoA : equipoB;
                    int visitante = vuelta == 0 ? equipoB : equipoA;

                    _db.Partidos.Add(new Partido
                    {
                        IdJornada         = jornada.IdJornada,
                        IdEquipoLocal     = local,
                        IdEquipoVisitante = visitante,
                        Fecha             = fechaJornada,
                        Jugado            = false,
                    });
                    totalPartidos++;
                }
                await _db.SaveChangesAsync();

                // Rotar: primer equipo fijo, resto rota
                var ultimo = equiposVuelta[equiposVuelta.Count - 1];
                equiposVuelta.RemoveAt(equiposVuelta.Count - 1);
                equiposVuelta.Insert(1, ultimo);
            }
        }

        string msg = req.IdaYVuelta
            ? $"Calendario generado: {totalRondas * 2} jornadas (ida y vuelta), {totalPartidos} partidos."
            : $"Calendario generado: {totalRondas} jornadas, {totalPartidos} partidos.";

        return ServiceResult<string>.Ok(msg);
    }

    // ── Fases del campeonato ─────────────────────────────────────────────────

    public async Task<List<FaseCampeonatoDto>> GetFasesByCampeonatoAsync(int idCampeonato)
        => !await _acceso.CampeonatoAsync(idCampeonato) ? [] : await _db.FasesCampeonato
            .Where(f => f.IdCampeonato == idCampeonato)
            .Include(f => f.Instancia)
            .OrderBy(f => f.Orden)
            .Select(f => new FaseCampeonatoDto(
                f.IdFase, f.IdCampeonato, f.IdInstancia,
                f.Instancia.Nombre, f.Orden,
                f.Formato.ToString(), f.EquiposClasifican
            ))
            .ToListAsync();

    public async Task<ServiceResult<FaseCampeonatoDto>> CreateFaseAsync(int idCampeonato, CreateFaseRequest req)
    {
        if (!await _acceso.CampeonatoAsync(idCampeonato)) return ServiceResult<FaseCampeonatoDto>.Fail("Campeonato no encontrado.");
        var campeonatoExiste = await _db.Campeonatos.AnyAsync(c => c.IdCampeonato == idCampeonato);
        if (!campeonatoExiste) return ServiceResult<FaseCampeonatoDto>.Fail("Campeonato no encontrado.");

        if (!Enum.TryParse<FormatoFase>(req.Formato, out var formato))
            return ServiceResult<FaseCampeonatoDto>.Fail("Formato inválido. Use: GRUPOS, ELIMINACION_DIRECTA, IDA_Y_VUELTA");

        var fase = new FaseCampeonato
        {
            IdCampeonato      = idCampeonato,
            IdInstancia       = req.IdInstancia,
            Orden             = req.Orden,
            Formato           = formato,
            EquiposClasifican = req.EquiposClasifican,
        };
        _db.FasesCampeonato.Add(fase);
        await _db.SaveChangesAsync();

        var instancia = await _db.CatalogoInstancias.FindAsync(req.IdInstancia);
        return ServiceResult<FaseCampeonatoDto>.Ok(new FaseCampeonatoDto(
            fase.IdFase, fase.IdCampeonato, fase.IdInstancia,
            instancia?.Nombre ?? "", fase.Orden,
            fase.Formato.ToString(), fase.EquiposClasifican
        ));
    }

    public async Task<ServiceResult> DeleteFaseAsync(int id)
    {
        if (!await _acceso.FaseAsync(id)) return ServiceResult.Fail("Fase no encontrada.");
        var fase = await _db.FasesCampeonato.FindAsync(id);
        if (fase is null) return ServiceResult.Fail("Fase no encontrada.");
        _db.FasesCampeonato.Remove(fase);
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }
}
