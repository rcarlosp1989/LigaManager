namespace LigaManager.API.Controllers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using LigaManager.Application.Interfaces;
using LigaManager.Application.DTOs.Jornadas;
using LigaManager.Application.DTOs.Partidos;

[ApiController]
[Authorize]
public class JornadasController : ControllerBase
{
    private readonly IJornadaService _service;
    public JornadasController(IJornadaService service) => _service = service;

    // ── Jornadas por campeonato ──────────────────────────────────────────────

    [HttpGet("api/campeonatos/{idCampeonato:int}/jornadas")]
    public async Task<IActionResult> GetByCampeonato(int idCampeonato)
        => Ok(await _service.GetByCampeonatoAsync(idCampeonato));

    [HttpPost("api/campeonatos/{idCampeonato:int}/jornadas")]
    public async Task<IActionResult> Create(int idCampeonato, [FromBody] CreateJornadaRequest req)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var result = await _service.CreateAsync(idCampeonato, req);
        if (!result.Success) return BadRequest(new { error = result.Error });
        return CreatedAtAction(nameof(GetById),
            new { id = result.Data!.IdJornada }, result.Data);
    }

    [HttpGet("api/jornadas/{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _service.GetByIdAsync(id);
        return result.Success ? Ok(result.Data) : NotFound(new { error = result.Error });
    }

    [HttpDelete("api/jornadas/{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _service.DeleteAsync(id);
        return result.Success ? NoContent() : BadRequest(new { error = result.Error });
    }

    // ── Partidos dentro de una jornada ───────────────────────────────────────

    [HttpPost("api/jornadas/{idJornada:int}/partidos")]
    public async Task<IActionResult> AgregarPartido(int idJornada, [FromBody] CreatePartidoRequest req)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var result = await _service.AgregarPartidoAsync(idJornada, req);
        if (!result.Success) return BadRequest(new { error = result.Error });
        return Ok(result.Data);
    }

    [HttpDelete("api/partidos/{idPartido:int}")]
    public async Task<IActionResult> EliminarPartido(int idPartido)
    {
        var result = await _service.EliminarPartidoAsync(idPartido);
        return result.Success ? NoContent() : BadRequest(new { error = result.Error });
    }

    [HttpPut("api/partidos/{idPartido:int}")]
    public async Task<IActionResult> EditarPartido(int idPartido, [FromBody] EditarPartidoRequest req)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var result = await _service.EditarPartidoAsync(idPartido, req);
        return result.Success ? Ok(result.Data) : BadRequest(new { error = result.Error });
    }

    // ── Marcar jugado y eventos ──────────────────────────────────────────────

    [HttpPut("api/partidos/{idPartido:int}/jugado")]
    public async Task<IActionResult> MarcarJugado(int idPartido, [FromBody] MarcarJugadoRequest req)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var result = await _service.MarcarJugadoAsync(idPartido, req);
        return result.Success ? Ok(result.Data) : BadRequest(new { error = result.Error });
    }

    [HttpPost("api/partidos/{idPartido:int}/eventos")]
    public async Task<IActionResult> RegistrarEvento(int idPartido, [FromBody] RegistrarEventoRequest req)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var result = await _service.RegistrarEventoAsync(idPartido, req);
        return result.Success ? Ok(result.Data) : BadRequest(new { error = result.Error });
    }

    [HttpDelete("api/eventos/{idEvento:int}")]
    public async Task<IActionResult> EliminarEvento(int idEvento)
    {
        var result = await _service.EliminarEventoAsync(idEvento);
        return result.Success ? NoContent() : BadRequest(new { error = result.Error });
    }
}
