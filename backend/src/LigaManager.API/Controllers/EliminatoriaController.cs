namespace LigaManager.API.Controllers;
using LigaManager.Application.Common;
using LigaManager.Application.DTOs.Eliminatoria;
using LigaManager.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

// Fase eliminatoria (organizador). La consulta de solo lectura para el enlace público y el
// dirigente está en PublicoController y DirigentesController.
[ApiController]
[Authorize]
public class EliminatoriaController : ControllerBase
{
    private readonly EliminatoriaService _service;
    public EliminatoriaController(EliminatoriaService service) => _service = service;

    private IActionResult Resultado<T>(ServiceResult<T> r) => r.Success ? Ok(r.Data) : BadRequest(new { error = r.Error });

    [HttpGet("api/campeonatos/{idCampeonato:int}/eliminatoria")]
    public async Task<IActionResult> Consultar(int idCampeonato) => Resultado(await _service.ConsultarAsync(idCampeonato));

    [HttpPut("api/campeonatos/{idCampeonato:int}/eliminatoria")]
    public async Task<IActionResult> Guardar(int idCampeonato, [FromBody] GuardarEliminatoriaRequest req)
        => Resultado(await _service.GuardarAsync(idCampeonato, req));

    [HttpDelete("api/campeonatos/{idCampeonato:int}/eliminatoria")]
    public async Task<IActionResult> Eliminar(int idCampeonato)
    {
        var r = await _service.EliminarAsync(idCampeonato);
        return r.Success ? NoContent() : BadRequest(new { error = r.Error });
    }

    [HttpPost("api/campeonatos/{idCampeonato:int}/eliminatoria/rondas/{tipo}")]
    public async Task<IActionResult> CrearRonda(int idCampeonato, string tipo, [FromBody] CrearRondaRequest req)
        => Resultado(await _service.CrearRondaAsync(idCampeonato, tipo, req));

    [HttpDelete("api/campeonatos/{idCampeonato:int}/eliminatoria/rondas/{tipo}")]
    public async Task<IActionResult> EliminarRonda(int idCampeonato, string tipo)
        => Resultado(await _service.EliminarRondaAsync(idCampeonato, tipo));

    // Datos de la llave para cerrar el partido en vivo (204 si no es de la fase eliminatoria).
    [HttpGet("api/partidos/{idPartido:int}/llave")]
    public async Task<IActionResult> InfoCierre(int idPartido)
    {
        var r = await _service.InfoCierreAsync(idPartido);
        return !r.Success ? BadRequest(new { error = r.Error }) : r.Data is null ? NoContent() : Ok(r.Data);
    }

    [HttpPut("api/llaves/{idLlave:int}/penales")]
    public async Task<IActionResult> Penales(int idLlave, [FromBody] PenalesRequest req)
        => Resultado(await _service.PenalesAsync(idLlave, req));
}
