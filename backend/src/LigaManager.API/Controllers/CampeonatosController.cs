namespace LigaManager.API.Controllers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using LigaManager.Application.Interfaces;
using LigaManager.Application.DTOs.Campeonatos;

[ApiController]
[Route("api/campeonatos")]
[Authorize]
public class CampeonatosController : ControllerBase
{
    private readonly ICampeonatoService _service;
    public CampeonatosController(ICampeonatoService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> GetAll()
        => Ok(await _service.GetAllAsync());

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _service.GetByIdAsync(id);
        return result.Success ? Ok(result.Data) : NotFound(new { error = result.Error });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCampeonatoRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var result = await _service.CreateAsync(request);
        if (!result.Success) return BadRequest(new { error = result.Error });
        return CreatedAtAction(nameof(GetById),
            new { id = result.Data!.IdCampeonato }, result.Data);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateCampeonatoRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var result = await _service.UpdateAsync(id, request);
        return result.Success ? Ok(result.Data) : BadRequest(new { error = result.Error });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _service.DeleteAsync(id);
        return result.Success ? NoContent() : BadRequest(new { error = result.Error });
    }

    [HttpPost("{id:int}/equipos/{idEquipo:int}")]
    public async Task<IActionResult> AgregarEquipo(int id, int idEquipo)
    {
        var result = await _service.AgregarEquipoAsync(id, idEquipo);
        return result.Success ? Ok() : BadRequest(new { error = result.Error });
    }

    [HttpDelete("{id:int}/equipos/{idEquipo:int}")]
    public async Task<IActionResult> RemoverEquipo(int id, int idEquipo)
    {
        var result = await _service.RemoverEquipoAsync(id, idEquipo);
        return result.Success ? NoContent() : BadRequest(new { error = result.Error });
    }
}