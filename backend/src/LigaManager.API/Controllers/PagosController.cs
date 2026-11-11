namespace LigaManager.API.Controllers;
using LigaManager.Application.Common;
using LigaManager.Application.DTOs.Pagos;
using LigaManager.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

// Pagos del campeonato (organizador). La cuenta del equipo del dirigente está en DirigentesController.
[ApiController]
[Authorize]
public class PagosController : ControllerBase
{
    private readonly PagoService _service;
    public PagosController(PagoService service) => _service = service;

    private IActionResult Resultado<T>(ServiceResult<T> r) => r.Success ? Ok(r.Data) : BadRequest(new { error = r.Error });

    [HttpGet("api/campeonatos/{idCampeonato:int}/pagos")]
    public async Task<IActionResult> Resumen(int idCampeonato) => Resultado(await _service.ResumenAsync(idCampeonato));

    [HttpPut("api/campeonatos/{idCampeonato:int}/pagos/valores")]
    public async Task<IActionResult> Valores(int idCampeonato, [FromBody] GuardarValoresRequest req)
        => Resultado(await _service.GuardarValoresAsync(idCampeonato, req));

    [HttpGet("api/campeonatos/{idCampeonato:int}/pagos/equipos/{idEquipo:int}")]
    public async Task<IActionResult> Cuenta(int idCampeonato, int idEquipo)
        => Resultado(await _service.CuentaOrganizadorAsync(idCampeonato, idEquipo));

    [HttpPost("api/campeonatos/{idCampeonato:int}/pagos/cobros")]
    public async Task<IActionResult> CobroManual(int idCampeonato, [FromBody] CobroManualRequest req)
        => Resultado(await _service.CobroManualAsync(idCampeonato, req));

    [HttpDelete("api/campeonatos/{idCampeonato:int}/pagos/cobros/{idPago:int}")]
    public async Task<IActionResult> EliminarCobro(int idCampeonato, int idPago)
        => Resultado(await _service.EliminarCobroAsync(idCampeonato, idPago));

    [HttpPost("api/campeonatos/{idCampeonato:int}/pagos/equipos/{idEquipo:int}/abonos")]
    public async Task<IActionResult> Abonar(int idCampeonato, int idEquipo, [FromBody] AbonoRequest req)
        => Resultado(await _service.AbonarAsync(idCampeonato, idEquipo, req));

    [HttpDelete("api/campeonatos/{idCampeonato:int}/pagos/abonos/{lote}")]
    public async Task<IActionResult> EliminarAbono(int idCampeonato, string lote)
        => Resultado(await _service.EliminarAbonoAsync(idCampeonato, lote));
}
