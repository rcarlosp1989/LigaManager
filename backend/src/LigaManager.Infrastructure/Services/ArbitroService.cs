namespace LigaManager.Infrastructure.Services;
using LigaManager.Application.DTOs.Arbitros;
using LigaManager.Application.Common;
using LigaManager.Application.Interfaces;
using LigaManager.Domain.Entities;
using LigaManager.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;

public class ArbitroService : IArbitroService
{
    private readonly LigaManagerContext _db;
    private readonly IHttpContextAccessor _http;
    private readonly Ubicaciones _ubicaciones;
    public ArbitroService(LigaManagerContext db, IHttpContextAccessor http, Ubicaciones ubicaciones) { _db = db; _http = http; _ubicaciones = ubicaciones; }
    private int? UsuarioActualId => int.TryParse(_http.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    private static ArbitroDetalleDto ToDetalle(Arbitro a) => new(
        a.IdArbitro,
        a.IdPersona,
        a.Persona.Nombre,
        a.Persona.Apellido,
        a.Persona.Cedula,
        a.Persona.FechaNac.ToString("yyyy-MM-dd"),
        a.Persona.IdPais,
        a.Persona.Pais.Nombre,
        a.Persona.Canton?.IdProvincia,
        a.Persona.Canton?.Provincia.Nombre,
        a.Persona.IdCanton,
        a.Persona.Canton?.Nombre
    );

    public async Task<List<ArbitroListDto>> GetAllAsync()
        => await _db.Arbitros
            .Include(a => a.Persona).ThenInclude(p => p.Pais)
            .Include(a => a.Persona).ThenInclude(p => p.Canton).ThenInclude(c => c!.Provincia)
            .Where(a => a.IdUsuarioCreador == UsuarioActualId)
            .OrderBy(a => a.Persona.Apellido)
            .Select(a => new ArbitroListDto(
                a.IdArbitro,
                a.Persona.Nombre,
                a.Persona.Apellido,
                a.Persona.Pais.Nombre,
                a.Persona.Canton != null ? a.Persona.Canton.Provincia.Nombre : null,
                a.Persona.Canton != null ? a.Persona.Canton.Nombre : null
            ))
            .ToListAsync();

    public async Task<ServiceResult<ArbitroDetalleDto>> GetByIdAsync(int id)
    {
        var a = await _db.Arbitros
            .Include(a => a.Persona).ThenInclude(p => p.Pais)
            .Include(a => a.Persona).ThenInclude(p => p.Canton).ThenInclude(c => c!.Provincia)
            .FirstOrDefaultAsync(a => a.IdArbitro == id && a.IdUsuarioCreador == UsuarioActualId);

        if (a is null) return ServiceResult<ArbitroDetalleDto>.Fail("Árbitro no encontrado.");
        return ServiceResult<ArbitroDetalleDto>.Ok(ToDetalle(a));
    }

    public async Task<ServiceResult<ArbitroDetalleDto>> CreateAsync(CreateArbitroRequest req)
    {
        if (!DateOnly.TryParse(req.FechaNac, out var fechaNac))
            return ServiceResult<ArbitroDetalleDto>.Fail("Formato de fecha inválido. Use yyyy-MM-dd.");

        var ubicacion = await _ubicaciones.ValidarAsync(req.IdPais, req.IdCanton);
        if (ubicacion.Error is not null)
            return ServiceResult<ArbitroDetalleDto>.Fail(ubicacion.Error);

        var persona = new Persona
        {
            Nombre    = req.Nombre.Trim(),
            Apellido  = req.Apellido.Trim(),
            Cedula    = string.IsNullOrWhiteSpace(req.Cedula)
                        ? $"AR-{DateTime.UtcNow.Ticks % 10000000000000000L}"
                        : req.Cedula.Trim(),
            FechaNac  = fechaNac,
            IdPais    = req.IdPais,
            IdCanton  = ubicacion.IdCanton,
        };
        _db.Personas.Add(persona);
        await _db.SaveChangesAsync();

        var arbitro = new Arbitro { IdPersona = persona.IdPersona, IdUsuarioCreador = UsuarioActualId };
        _db.Arbitros.Add(arbitro);
        await _db.SaveChangesAsync();

        return await GetByIdAsync(arbitro.IdArbitro);
    }

    public async Task<ServiceResult> DeleteAsync(int id)
    {
        var a = await _db.Arbitros
            .Include(a => a.Partidos)
            .FirstOrDefaultAsync(a => a.IdArbitro == id && a.IdUsuarioCreador == UsuarioActualId);

        if (a is null) return ServiceResult.Fail("Árbitro no encontrado.");
        if (a.Partidos.Any())
            return ServiceResult.Fail("No se puede eliminar: el árbitro tiene partidos asignados.");

        var persona = await _db.Personas.FindAsync(a.IdPersona);
        _db.Arbitros.Remove(a);
        if (persona is not null) _db.Personas.Remove(persona);
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }
}
