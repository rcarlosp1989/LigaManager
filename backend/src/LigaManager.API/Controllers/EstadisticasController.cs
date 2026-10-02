namespace LigaManager.API.Controllers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using LigaManager.Application.Interfaces;
using LigaManager.Application.DTOs.Estadisticas;

[ApiController]
[Authorize]
public class EstadisticasController : ControllerBase
{
    private readonly IEstadisticasService _service;
    public EstadisticasController(IEstadisticasService service) => _service = service;

    [HttpGet("api/campeonatos/{idCampeonato:int}/estadisticas/posiciones")]
    public async Task<IActionResult> GetPosiciones(int idCampeonato, [FromQuery] int? idGrupo)
        => Ok(await _service.GetPosicionesAsync(idCampeonato, idGrupo));

    [HttpGet("api/campeonatos/{idCampeonato:int}/estadisticas/goleadores")]
    public async Task<IActionResult> GetGoleadores(int idCampeonato, [FromQuery] int? top)
        => Ok(await _service.GetGoleadoresAsync(idCampeonato, top));

    [HttpGet("api/campeonatos/{idCampeonato:int}/estadisticas/tarjetas")]
    public async Task<IActionResult> GetTarjetas(int idCampeonato)
        => Ok(await _service.GetTarjetasAsync(idCampeonato));

    [HttpGet("api/campeonatos/{idCampeonato:int}/estadisticas/suspensiones")]
    public async Task<IActionResult> GetSuspensiones(int idCampeonato)
        => Ok(await _service.GetSuspensionesAsync(idCampeonato));

    // Sanción agregada a mano por la comisión disciplinaria.
    [HttpPost("api/campeonatos/{idCampeonato:int}/estadisticas/suspensiones")]
    public async Task<IActionResult> AgregarSancionManual(int idCampeonato, [FromBody] AgregarSancionManualRequest req)
    {
        var result = await _service.AgregarSancionManualAsync(idCampeonato, req);
        return result.Success ? Ok(result.Data) : BadRequest(new { error = result.Error });
    }

    [HttpDelete("api/campeonatos/{idCampeonato:int}/estadisticas/suspensiones/{idSancion:int}")]
    public async Task<IActionResult> EliminarSancionManual(int idCampeonato, int idSancion)
    {
        var result = await _service.EliminarSancionManualAsync(idCampeonato, idSancion);
        return result.Success ? NoContent() : BadRequest(new { error = result.Error });
    }
}
