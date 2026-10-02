namespace LigaManager.API.Controllers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using LigaManager.Application.Interfaces;

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
}
