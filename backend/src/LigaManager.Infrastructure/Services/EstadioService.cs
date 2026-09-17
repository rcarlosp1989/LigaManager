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
    public EstadioService(LigaManagerContext db, IHttpContextAccessor http) { _db = db; _http = http; }
    private int? UsuarioActualId => int.TryParse(_http.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    private static EstadioListDto ToDto(Estadio e) => new(
        e.IdEstadio,
        e.Nombre,
        e.Ciudad.Nombre,
        e.Ciudad.Pais.Nombre
    );

    public async Task<List<EstadioListDto>> GetAllAsync()
        => await _db.Estadios
            .Include(e => e.Ciudad).ThenInclude(c => c.Pais)
            .Where(e => e.IdUsuarioCreador == UsuarioActualId)
            .OrderBy(e => e.Nombre)
            .Select(e => new EstadioListDto(
                e.IdEstadio,
                e.Nombre,
                e.Ciudad.Nombre,
                e.Ciudad.Pais.Nombre
            ))
            .ToListAsync();

    public async Task<ServiceResult<EstadioListDto>> CreateAsync(CreateEstadioRequest req)
    {
        var ciudadExiste = await _db.Ciudades
            .Include(c => c.Pais)
            .FirstOrDefaultAsync(c => c.IdCiudad == req.IdCiudad);

        if (ciudadExiste is null)
            return ServiceResult<EstadioListDto>.Fail("Ciudad no encontrada.");

        var estadio = new Estadio
        {
            Nombre   = req.Nombre.Trim(),
            IdCiudad = req.IdCiudad,
            IdUsuarioCreador = UsuarioActualId,
        };
        _db.Estadios.Add(estadio);
        await _db.SaveChangesAsync();

        var result = await _db.Estadios
            .Include(e => e.Ciudad).ThenInclude(c => c.Pais)
            .FirstAsync(e => e.IdEstadio == estadio.IdEstadio);

        return ServiceResult<EstadioListDto>.Ok(ToDto(result));
    }

    public async Task<ServiceResult<EstadioListDto>> UpdateAsync(int id, UpdateEstadioRequest req)
    {
        var estadio = await _db.Estadios
            .Include(e => e.Ciudad).ThenInclude(c => c.Pais)
            .FirstOrDefaultAsync(e => e.IdEstadio == id && e.IdUsuarioCreador == UsuarioActualId);

        if (estadio is null)
            return ServiceResult<EstadioListDto>.Fail("Estadio no encontrado.");

        var ciudadExiste = await _db.Ciudades
            .Include(c => c.Pais)
            .FirstOrDefaultAsync(c => c.IdCiudad == req.IdCiudad);

        if (ciudadExiste is null)
            return ServiceResult<EstadioListDto>.Fail("Ciudad no encontrada.");

        estadio.Nombre   = req.Nombre.Trim();
        estadio.IdCiudad = req.IdCiudad;
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
