namespace LigaManager.Infrastructure.Services;
using LigaManager.Application.DTOs.Estadios;
using LigaManager.Application.Common;
using LigaManager.Application.Interfaces;
using LigaManager.Domain.Entities;
using LigaManager.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;

public class EstadioService : IEstadioService
{
    private readonly LigaManagerContext _db;
    private readonly IHttpContextAccessor _http;
    private readonly Ubicaciones _ubicaciones;
    public EstadioService(LigaManagerContext db, IHttpContextAccessor http, Ubicaciones ubicaciones) { _db = db; _http = http; _ubicaciones = ubicaciones; }
    private int? UsuarioActualId => int.TryParse(_http.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    private static EstadioListDto ToDto(Estadio e) => new(
        e.IdEstadio,
        e.Nombre,
        e.IdPais,
        e.Pais.Nombre,
        e.Canton?.IdProvincia,
        e.Canton?.Provincia.Nombre,
        e.IdCanton,
        e.Canton?.Nombre
    );

    public async Task<List<EstadioListDto>> GetAllAsync()
        => await _db.Estadios
            .Include(e => e.Pais)
            .Include(e => e.Canton).ThenInclude(c => c!.Provincia)
            .Where(e => e.IdUsuarioCreador == UsuarioActualId)
            .OrderBy(e => e.Nombre)
            .Select(e => new EstadioListDto(
                e.IdEstadio,
                e.Nombre,
                e.IdPais,
                e.Pais.Nombre,
                e.Canton != null ? (int?)e.Canton.IdProvincia : null,
                e.Canton != null ? e.Canton.Provincia.Nombre : null,
                e.IdCanton,
                e.Canton != null ? e.Canton.Nombre : null
            ))
            .ToListAsync();

    public async Task<ServiceResult<EstadioListDto>> CreateAsync(CreateEstadioRequest req)
    {
        var ubicacion = await _ubicaciones.ValidarAsync(req.IdPais, req.IdCanton);
        if (ubicacion.Error is not null)
            return ServiceResult<EstadioListDto>.Fail(ubicacion.Error);

        var estadio = new Estadio
        {
            Nombre   = req.Nombre.Trim(),
            IdPais   = req.IdPais,
            IdCanton = ubicacion.IdCanton,
            IdUsuarioCreador = UsuarioActualId,
        };
        _db.Estadios.Add(estadio);
        await _db.SaveChangesAsync();

        var result = await _db.Estadios
            .Include(e => e.Pais)
            .Include(e => e.Canton).ThenInclude(c => c!.Provincia)
            .FirstAsync(e => e.IdEstadio == estadio.IdEstadio);

        return ServiceResult<EstadioListDto>.Ok(ToDto(result));
    }

    public async Task<ServiceResult<EstadioListDto>> UpdateAsync(int id, UpdateEstadioRequest req)
    {
        var estadio = await _db.Estadios
            .Include(e => e.Pais)
            .Include(e => e.Canton).ThenInclude(c => c!.Provincia)
            .FirstOrDefaultAsync(e => e.IdEstadio == id && e.IdUsuarioCreador == UsuarioActualId);

        if (estadio is null)
            return ServiceResult<EstadioListDto>.Fail("Estadio no encontrado.");

        var ubicacion = await _ubicaciones.ValidarAsync(req.IdPais, req.IdCanton);
        if (ubicacion.Error is not null)
            return ServiceResult<EstadioListDto>.Fail(ubicacion.Error);

        estadio.Nombre   = req.Nombre.Trim();
        estadio.IdPais   = req.IdPais;
        estadio.IdCanton = ubicacion.IdCanton;
        await _db.SaveChangesAsync();

        return ServiceResult<EstadioListDto>.Ok(ToDto(estadio));
    }

    public async Task<ServiceResult> DeleteAsync(int id)
    {
        var estadio = await _db.Estadios
            .Include(e => e.Partidos)
            .FirstOrDefaultAsync(e => e.IdEstadio == id && e.IdUsuarioCreador == UsuarioActualId);

        if (estadio is null)
            return ServiceResult.Fail("Estadio no encontrado.");
        if (estadio.Partidos.Any())
            return ServiceResult.Fail("No se puede eliminar: el estadio tiene partidos asignados.");

        _db.Estadios.Remove(estadio);
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }
}
