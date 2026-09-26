namespace LigaManager.Infrastructure.Services;
using LigaManager.Application.DTOs.Campeonatos;
using LigaManager.Application.Common;
using LigaManager.Application.Interfaces;
using LigaManager.Domain.Entities;
using LigaManager.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;

public class CampeonatoService : ICampeonatoService
{
    private readonly LigaManagerContext _db;
    private readonly IHttpContextAccessor _http;
    public CampeonatoService(LigaManagerContext db, IHttpContextAccessor http) { _db = db; _http = http; }

    private int? UsuarioActualId => int.TryParse(
        _http.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    private bool EsAdmin => string.Equals(
        _http.HttpContext?.User.FindFirstValue(ClaimTypes.Role), "Admin", StringComparison.OrdinalIgnoreCase);

    private IQueryable<Campeonato> CampeonatosVisibles()
        => EsAdmin ? _db.Campeonatos : _db.Campeonatos.Where(c => c.IdUsuarioCreador == UsuarioActualId);

    public async Task<List<CampeonatoListDto>> GetAllAsync()
        => await CampeonatosVisibles()
            .Include(c => c.TipoPartido)
            .Include(c => c.Equipos)
            .OrderByDescending(c => c.Anio)
            .Select(c => new CampeonatoListDto(
                c.IdCampeonato,
                c.Nombre,
                c.Anio,
                c.FechaInicio.ToString("yyyy-MM-dd"),
                c.FechaFin.ToString("yyyy-MM-dd"),
                c.Estado.ToString(),
                c.TipoPartido.Nombre,
                c.Equipos.Count
            ))
            .ToListAsync();

    public async Task<ServiceResult<CampeonatoDetalleDto>> GetByIdAsync(int id)
    {
        var c = await CampeonatosVisibles()
            .Include(c => c.TipoPartido)
            .Include(c => c.ModalidadDeportiva)
            .Include(c => c.Equipos).ThenInclude(ce => ce.Equipo).ThenInclude(e => e.Pais)
            .FirstOrDefaultAsync(c => c.IdCampeonato == id);

        if (c is null) return ServiceResult<CampeonatoDetalleDto>.Fail("Campeonato no encontrado.");

        return ServiceResult<CampeonatoDetalleDto>.Ok(new CampeonatoDetalleDto(
            c.IdCampeonato, c.Nombre, c.Anio,
            c.FechaInicio.ToString("yyyy-MM-dd"),
            c.FechaFin.ToString("yyyy-MM-dd"),
            c.Estado.ToString(),
            c.IdTipoPartido, c.TipoPartido.Nombre,
            c.IdModalidad, c.ModalidadDeportiva.Nombre,
            c.Equipos.Select(ce => new EquipoEnCampeonatoDto(
                ce.IdEquipo, ce.Equipo.Nombre, ce.Equipo.Pais.Nombre
            )).ToList()
        ));
    }

    public async Task<ServiceResult<CampeonatoDetalleDto>> CreateAsync(CreateCampeonatoRequest req)
    {
        if (!DateOnly.TryParse(req.FechaInicio, out var fi) ||
            !DateOnly.TryParse(req.FechaFin,    out var ff))
            return ServiceResult<CampeonatoDetalleDto>.Fail("Formato de fecha inválido. Use yyyy-MM-dd.");

        if (ff <= fi)
            return ServiceResult<CampeonatoDetalleDto>.Fail("La fecha de fin debe ser posterior a la de inicio.");

        var tipoExiste = await _db.TiposPartido.AnyAsync(t => t.IdTipoPartido == req.IdTipoPartido);
        if (!tipoExiste)
            return ServiceResult<CampeonatoDetalleDto>.Fail("Tipo de partido no existe.");

        var modalidadExiste = await _db.ModalidadesDeportivas.AnyAsync(m => m.IdModalidad == req.IdModalidad);
        if (!modalidadExiste)
            return ServiceResult<CampeonatoDetalleDto>.Fail("Modalidad deportiva no existe.");

        var campeonato = new Campeonato
        {
            Nombre        = req.Nombre.Trim(),
            Anio          = req.Anio,
            FechaInicio   = fi,
            FechaFin      = ff,
            Estado        = EstadoCampeonato.Planificado,
            IdTipoPartido = req.IdTipoPartido,
            IdModalidad   = req.IdModalidad,
            IdUsuarioCreador = UsuarioActualId
        };

        _db.Campeonatos.Add(campeonato);
        await _db.SaveChangesAsync();
        return await GetByIdAsync(campeonato.IdCampeonato);
    }

    public async Task<ServiceResult<CampeonatoDetalleDto>> UpdateAsync(int id, UpdateCampeonatoRequest req)
    {
        var c = await CampeonatosVisibles().FirstOrDefaultAsync(c => c.IdCampeonato == id);
        if (c is null) return ServiceResult<CampeonatoDetalleDto>.Fail("Campeonato no encontrado.");

        if (!DateOnly.TryParse(req.FechaInicio, out var fi) ||
            !DateOnly.TryParse(req.FechaFin,    out var ff))
            return ServiceResult<CampeonatoDetalleDto>.Fail("Formato de fecha inválido.");

        if (ff <= fi)
            return ServiceResult<CampeonatoDetalleDto>.Fail("La fecha de fin debe ser posterior a la de inicio.");

        if (!Enum.TryParse<EstadoCampeonato>(req.Estado, out var estado))
            return ServiceResult<CampeonatoDetalleDto>.Fail("Estado inválido. Use: Planificado, EnCurso o Finalizado.");

        c.Nombre        = req.Nombre.Trim();
        c.Anio          = req.Anio;
        c.FechaInicio   = fi;
        c.FechaFin      = ff;
        c.Estado        = estado;
        c.IdTipoPartido = req.IdTipoPartido;
        c.IdModalidad   = req.IdModalidad;

        await _db.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task<ServiceResult> DeleteAsync(int id)
    {
        var c = await CampeonatosVisibles().FirstOrDefaultAsync(c => c.IdCampeonato == id);
        if (c is null) return ServiceResult.Fail("Campeonato no encontrado.");

        var tieneJornadas = await _db.Jornadas.AnyAsync(j => j.IdCampeonato == id);
        if (tieneJornadas)
            return ServiceResult.Fail("No se puede eliminar: el campeonato tiene jornadas registradas.");

        _db.Campeonatos.Remove(c);
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    public async Task<ServiceResult> AgregarEquipoAsync(int idCampeonato, int idEquipo)
    {
        var campeonatoPropio = await _db.Campeonatos
            .AnyAsync(c => c.IdCampeonato == idCampeonato && c.IdUsuarioCreador == UsuarioActualId);
        if (!campeonatoPropio) return ServiceResult.Fail("Campeonato no encontrado.");

        var equipoPropio = await _db.Equipos
            .AnyAsync(e => e.IdEquipo == idEquipo && e.IdUsuarioCreador == UsuarioActualId);
        if (!equipoPropio) return ServiceResult.Fail("El equipo no pertenece a tu organización.");

        var existe = await _db.CampeonatoEquipos
            .AnyAsync(ce => ce.IdCampeonato == idCampeonato && ce.IdEquipo == idEquipo);
        if (existe) return ServiceResult.Fail("El equipo ya está inscrito en este campeonato.");

        _db.CampeonatoEquipos.Add(new CampeonatoEquipo
        {
            IdCampeonato = idCampeonato,
            IdEquipo     = idEquipo
        });
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    public async Task<ServiceResult> RemoverEquipoAsync(int idCampeonato, int idEquipo)
    {
        var ce = await _db.CampeonatoEquipos
            .Include(ce => ce.Campeonato)
            .FirstOrDefaultAsync(ce => ce.IdCampeonato == idCampeonato
                                    && ce.IdEquipo == idEquipo
                                    && ce.Campeonato.IdUsuarioCreador == UsuarioActualId);
        if (ce is null) return ServiceResult.Fail("El equipo no está inscrito en este campeonato.");

        _db.CampeonatoEquipos.Remove(ce);
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }
}
