namespace LigaManager.API.Controllers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using LigaManager.Infrastructure.Data;

[ApiController]
[Route("api/catalogos")]
[Authorize]
public class CatalogosController : ControllerBase
{
    private readonly LigaManagerContext _db;
    public CatalogosController(LigaManagerContext db) => _db = db;

    private int? UsuarioActualId => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    [HttpGet("paises")]
    public async Task<IActionResult> GetPaises()
        => Ok(await _db.Paises
            .OrderBy(p => p.Nombre)
            .Select(p => new { p.IdPais, p.Nombre })
            .ToListAsync());

    [HttpGet("tipos-partido")]
    public async Task<IActionResult> GetTiposPartido()
        => Ok(await _db.TiposPartido
            .OrderBy(t => t.Nombre)
            .Select(t => new { t.IdTipoPartido, t.Nombre })
            .ToListAsync());

    [HttpGet("modalidades")]
    public async Task<IActionResult> GetModalidades()
        => Ok(await _db.ModalidadesDeportivas
            .OrderBy(m => m.Nombre)
            .Select(m => new { m.IdModalidad, m.Nombre })
            .ToListAsync());

    [HttpGet("cargos-oficiales")]
    public async Task<IActionResult> GetCargosOficiales([FromQuery] int modalidadId)
        => Ok(await _db.ModalidadCargos
            .Where(mc => mc.IdModalidad == modalidadId)
            .OrderBy(mc => mc.IdCargo)
            .Select(mc => new { mc.IdCargo, Cargo = mc.Cargo.Nombre, mc.Cargo.Codigo, mc.Obligatorio })
            .ToListAsync());

    [HttpGet("instancias")]
    public async Task<IActionResult> GetInstancias()
        => Ok(await _db.CatalogoInstancias
            .OrderBy(i => i.Nombre)
            .Select(i => new { i.IdInstancia, i.Nombre })
            .ToListAsync());

    [HttpGet("estadios")]
    public async Task<IActionResult> GetEstadios()
        => Ok(await _db.Estadios
            .Where(e => e.IdUsuarioCreador == UsuarioActualId)
            .OrderBy(e => e.Nombre)
            .Select(e => new { e.IdEstadio, e.Nombre })
            .ToListAsync());

    [HttpGet("provincias")]
    public async Task<IActionResult> GetProvincias([FromQuery] int paisId)
        => Ok(await _db.Provincias
            .Where(p => p.IdPais == paisId)
            .OrderBy(p => p.Nombre)
            .Select(p => new { p.IdProvincia, p.Nombre })
            .ToListAsync());

    [HttpGet("cantones")]
    public async Task<IActionResult> GetCantones([FromQuery] int provinciaId)
        => Ok(await _db.Cantones
            .Where(c => c.IdProvincia == provinciaId)
            .OrderBy(c => c.Nombre)
            .Select(c => new { c.IdCanton, c.Nombre })
            .ToListAsync());
}
