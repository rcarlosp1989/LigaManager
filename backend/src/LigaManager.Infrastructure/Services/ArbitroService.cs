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
    public ArbitroService(LigaManagerContext db, IHttpContextAccessor http) { _db = db; _http = http; }
    private int? UsuarioActualId => int.TryParse(_http.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    private static ArbitroDetalleDto ToDetalle(Arbitro a) => new(
        a.IdArbitro,
        a.IdPersona,
        a.Persona.Nombre,
        a.Persona.Apellido,
        a.Persona.Cedula,
        a.Persona.FechaNac.ToString("yyyy-MM-dd"),
        a.Persona.Ciudad.Nombre,
        a.Persona.Ciudad.Pais.Nombre
    );

    public async Task<List<ArbitroListDto>> GetAllAsync()
        => await _db.Arbitros
            .Include(a => a.Persona).ThenInclude(p => p.Ciudad).ThenInclude(c => c.Pais)
            .Where(a => a.IdUsuarioCreador == UsuarioActualId)
            .OrderBy(a => a.Persona.Apellido)
            .Select(a => new ArbitroListDto(
                a.IdArbitro,
                a.Persona.Nombre,
                a.Persona.Apellido,
                a.Persona.Ciudad.Nombre,
                a.Persona.Ciudad.Pais.Nombre
            ))
            .ToListAsync();

    public async Task<ServiceResult<ArbitroDetalleDto>> GetByIdAsync(int id)
    {
        var a = await _db.Arbitros
            .Include(a => a.Persona).ThenInclude(p => p.Ciudad).ThenInclude(c => c.Pais)
            .FirstOrDefaultAsync(a => a.IdArbitro == id && a.IdUsuarioCreador == UsuarioActualId);

        if (a is null) return ServiceResult<ArbitroDetalleDto>.Fail("Árbitro no encontrado.");
        return ServiceResult<ArbitroDetalleDto>.Ok(ToDetalle(a));
    }

    public async Task<ServiceResult<ArbitroDetalleDto>> CreateAsync(CreateArbitroRequest req)
    {
        if (!DateOnly.TryParse(req.FechaNac, out var fechaNac))
            return ServiceResult<ArbitroDetalleDto>.Fail("Formato de fecha inválido. Use yyyy-MM-dd.");

        var ciudadExiste = await _db.Ciudades.AnyAsync(c => c.IdCiudad == req.IdCiudad);
        if (!ciudadExiste)
            return ServiceResult<ArbitroDetalleDto>.Fail("Ciudad no encontrada.");

        var persona = new Persona
        {
            Nombre    = req.Nombre.Trim(),
            Apellido  = req.Apellido.Trim(),
            Cedula    = string.IsNullOrWhiteSpace(req.Cedula)
                        ? $"AR-{DateTime.UtcNow.Ticks % 10000000000000000L}"
                        : req.Cedula.Trim(),
            FechaNac  = fechaNac,
            IdCiudad  = req.IdCiudad,
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
