namespace LigaManager.Infrastructure.Services;
using LigaManager.Application.DTOs.Equipos;
using LigaManager.Application.Common;
using LigaManager.Application.Interfaces;
using LigaManager.Domain.Entities;
using LigaManager.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;

public class EquipoService : IEquipoService
{
    private readonly LigaManagerContext _db;
    private readonly IHttpContextAccessor _http;
    public EquipoService(LigaManagerContext db, IHttpContextAccessor http) { _db = db; _http = http; }

    private int? UsuarioActualId => int.TryParse(
        _http.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    public async Task<List<EquipoListDto>> GetAllAsync()
        => await _db.Equipos
            .Include(e => e.Pais)
            .Include(e => e.JugadorEquipos)
            .Where(e => e.IdUsuarioCreador == UsuarioActualId)
            .OrderBy(e => e.Nombre)
            .Select(e => new EquipoListDto(
                e.IdEquipo,
                e.Nombre,
                e.Pais.Nombre,
                e.JugadorEquipos.Count(je => je.FechaHasta == null)
            ))
            .ToListAsync();

    public async Task<ServiceResult<EquipoDetalleDto>> GetByIdAsync(int id, DateOnly? fecha = null)
    {
        var e = await _db.Equipos
            .Include(e => e.Pais)
            .Include(e => e.JugadorEquipos)
                .ThenInclude(je => je.Jugador)
                    .ThenInclude(j => j.Persona)
            .FirstOrDefaultAsync(e => e.IdEquipo == id && e.IdUsuarioCreador == UsuarioActualId);

        if (e is null) return ServiceResult<EquipoDetalleDto>.Fail("Equipo no encontrado.");

        return ServiceResult<EquipoDetalleDto>.Ok(new EquipoDetalleDto(
            e.IdEquipo, e.Nombre, e.IdPais, e.Pais.Nombre,
            e.JugadorEquipos
                .Where(je => (!fecha.HasValue && je.FechaHasta == null)
                          || (fecha.HasValue
                              && je.FechaDesde <= fecha.Value
                              && (je.FechaHasta == null || je.FechaHasta >= fecha.Value)))
                .Select(je => new JugadorEnEquipoDto(
                    je.IdJugador,
                    je.Jugador.Persona.Nombre,
                    je.Jugador.Persona.Apellido,
                    je.FechaDesde.ToString("yyyy-MM-dd"),
                    je.FechaHasta?.ToString("yyyy-MM-dd"),
                    je.Dorsal
                )).ToList()
        ));
    }

    public async Task<ServiceResult<EquipoDetalleDto>> CreateAsync(CreateEquipoRequest req)
    {
        var nombreExiste = await _db.Equipos
            .AnyAsync(e => e.IdUsuarioCreador == UsuarioActualId
                        && e.Nombre.ToLower() == req.Nombre.ToLower().Trim());
        if (nombreExiste)
            return ServiceResult<EquipoDetalleDto>.Fail($"Ya existe un equipo con el nombre '{req.Nombre}'.");

        var paisExiste = await _db.Paises.AnyAsync(p => p.IdPais == req.IdPais);
        if (!paisExiste)
            return ServiceResult<EquipoDetalleDto>.Fail("País no encontrado.");

        var equipo = new Equipo { Nombre = req.Nombre.Trim(), IdPais = req.IdPais, IdUsuarioCreador = UsuarioActualId };
        _db.Equipos.Add(equipo);
        await _db.SaveChangesAsync();
        return await GetByIdAsync(equipo.IdEquipo);
    }

    public async Task<ServiceResult<EquipoDetalleDto>> UpdateAsync(int id, UpdateEquipoRequest req)
    {
        var equipo = await _db.Equipos.FirstOrDefaultAsync(e => e.IdEquipo == id && e.IdUsuarioCreador == UsuarioActualId);
        if (equipo is null) return ServiceResult<EquipoDetalleDto>.Fail("Equipo no encontrado.");

        var nombreDuplicado = await _db.Equipos
            .AnyAsync(e => e.IdUsuarioCreador == UsuarioActualId
                        && e.Nombre.ToLower() == req.Nombre.ToLower().Trim()
                        && e.IdEquipo != id);
        if (nombreDuplicado)
            return ServiceResult<EquipoDetalleDto>.Fail($"Ya existe otro equipo con el nombre '{req.Nombre}'.");

        equipo.Nombre = req.Nombre.Trim();
        equipo.IdPais = req.IdPais;
        await _db.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task<ServiceResult> DeleteAsync(int id)
    {
        var equipo = await _db.Equipos.FirstOrDefaultAsync(e => e.IdEquipo == id && e.IdUsuarioCreador == UsuarioActualId);
        if (equipo is null) return ServiceResult.Fail("Equipo no encontrado.");

        var enPartido = await _db.Partidos
            .AnyAsync(p => p.IdEquipoLocal == id || p.IdEquipoVisitante == id);
        if (enPartido)
            return ServiceResult.Fail("No se puede eliminar: el equipo tiene partidos registrados.");

        _db.Equipos.Remove(equipo);
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }
}