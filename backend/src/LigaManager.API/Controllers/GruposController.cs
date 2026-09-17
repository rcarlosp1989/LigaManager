namespace LigaManager.API.Controllers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using LigaManager.Application.Interfaces;
using LigaManager.Application.DTOs.Grupos;

[ApiController]
[Authorize]
public class GruposController : ControllerBase
{
    private readonly IGrupoService _service;
    public GruposController(IGrupoService service) => _service = service;

    // ── Grupos por campeonato ────────────────────────────────────────────────

    [HttpGet("api/campeonatos/{idCampeonato:int}/grupos")]
    public async Task<IActionResult> GetByCampeonato(int idCampeonato)
        => Ok(await _service.GetByCampeonatoAsync(idCampeonato));

    [HttpGet("api/campeonatos/{idCampeonato:int}/posiciones")]
    public async Task<IActionResult> GetPosicionesCampeonato(int idCampeonato)
        => Ok(await _service.GetPosicionesCampeonatoAsync(idCampeonato));

    [HttpPost("api/campeonatos/{idCampeonato:int}/grupos")]
    public async Task<IActionResult> Create(int idCampeonato, [FromBody] CreateGrupoRequest req)
    {
        var result = await _service.CreateAsync(idCampeonato, req);
        if (!result.Success) return BadRequest(new { error = result.Error });
        return Ok(result.Data);
    }

    [HttpGet("api/grupos/{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _service.GetByIdAsync(id);
        return result.Success ? Ok(result.Data) : NotFound(new { error = result.Error });
    }

    [HttpPut("api/grupos/{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateGrupoRequest req)
    {
        var result = await _service.UpdateAsync(id, req);
        return result.Success ? Ok(result.Data) : BadRequest(new { error = result.Error });
    }

    [HttpDelete("api/grupos/{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _service.DeleteAsync(id);
        return result.Success ? NoContent() : BadRequest(new { error = result.Error });
    }

    // ── Equipos en grupo ─────────────────────────────────────────────────────

    [HttpPost("api/grupos/{idGrupo:int}/equipos/{idEquipo:int}")]
    public async Task<IActionResult> AsignarEquipo(int idGrupo, int idEquipo)
    {
        var result = await _service.AsignarEquipoAsync(idGrupo, idEquipo);
        return result.Success ? Ok(result.Data) : BadRequest(new { error = result.Error });
    }

    [HttpDelete("api/grupos/{idGrupo:int}/equipos/{idEquipo:int}")]
    public async Task<IActionResult> RemoverEquipo(int idGrupo, int idEquipo)
    {
        var result = await _service.RemoverEquipoAsync(idGrupo, idEquipo);
        return result.Success ? Ok(result.Data) : BadRequest(new { error = result.Error });
    }

    // ── Calendario automático ────────────────────────────────────────────────

    [HttpPost("api/grupos/{idGrupo:int}/calendario")]
    public async Task<IActionResult> GenerarCalendario(int idGrupo, [FromBody] GenerarCalendarioRequest req)
    {
        var result = await _service.GenerarCalendarioAsync(idGrupo, req);
        return result.Success ? Ok(new { mensaje = result.Data }) : BadRequest(new { error = result.Error });
    }

    // ── Fases del campeonato ─────────────────────────────────────────────────

    [HttpGet("api/campeonatos/{idCampeonato:int}/fases")]
    public async Task<IActionResult> GetFases(int idCampeonato)
        => Ok(await _service.GetFasesByCampeonatoAsync(idCampeonato));

    [HttpPost("api/campeonatos/{idCampeonato:int}/fases")]
    public async Task<IActionResult> CreateFase(int idCampeonato, [FromBody] CreateFaseRequest req)
    {
        var result = await _service.CreateFaseAsync(idCampeonato, req);
        return result.Success ? Ok(result.Data) : BadRequest(new { error = result.Error });
    }

    [HttpDelete("api/fases/{id:int}")]
    public async Task<IActionResult> DeleteFase(int id)
    {
        var result = await _service.DeleteFaseAsync(id);
        return result.Success ? NoContent() : BadRequest(new { error = result.Error });
    }
}
