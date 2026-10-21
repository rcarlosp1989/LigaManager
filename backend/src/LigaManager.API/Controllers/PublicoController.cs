namespace LigaManager.API.Controllers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using LigaManager.Application.Interfaces;
using LigaManager.Infrastructure.Services;
using LigaManager.API.Seguridad;

// Enlace público del campeonato.
//  - /api/campeonatos/{id}/enlace-publico   organizador: ver, crear o cambiar, desactivar.
//  - /api/publico/{token}/…                 cualquiera con el enlace, sin cuenta, solo GET.
// Los reportes públicos reutilizan los servicios de siempre (AccesoCampeonato habilita la
// lectura de ese campeonato en la petición) y aquí se les quitan las fotos de los jugadores.
[ApiController]
public class PublicoController : ControllerBase
{
    private readonly PublicoService       _publico;
    private readonly IEstadisticasService _estadisticas;
    private readonly IGrupoService        _grupos;

    public PublicoController(PublicoService publico, IEstadisticasService estadisticas, IGrupoService grupos)
    {
        _publico = publico; _estadisticas = estadisticas; _grupos = grupos;
    }

    private IActionResult Resultado<T>(Application.Common.ServiceResult<T> r) => r.Success ? Ok(r.Data) : BadRequest(new { error = r.Error });

    // ── Organizador ──────────────────────────────────────────────────────────

    [Authorize]
    [HttpGet("api/campeonatos/{idCampeonato:int}/enlace-publico")]
    public async Task<IActionResult> Consultar(int idCampeonato) => Resultado(await _publico.ConsultarAsync(idCampeonato));

    [Authorize]
    [HttpPost("api/campeonatos/{idCampeonato:int}/enlace-publico")]
    public async Task<IActionResult> Generar(int idCampeonato) => Resultado(await _publico.GenerarAsync(idCampeonato));

    [Authorize]
    [HttpDelete("api/campeonatos/{idCampeonato:int}/enlace-publico")]
    public async Task<IActionResult> Desactivar(int idCampeonato)
    {
        var r = await _publico.DesactivarAsync(idCampeonato);
        return r.Success ? NoContent() : BadRequest(new { error = r.Error });
    }

    // ── Público ──────────────────────────────────────────────────────────────

    private static readonly object NoDisponible = new { error = "Este enlace no existe o fue desactivado por la organización." };

    [AllowAnonymous, LimitarIntentos("publico")]
    [HttpGet("api/publico/{token}")]
    public async Task<IActionResult> Campeonato(string token)
        => await _publico.AbrirAsync(token) is int id ? Ok(await _publico.CampeonatoAsync(id)) : NotFound(NoDisponible);

    [AllowAnonymous, LimitarIntentos("publico")]
    [HttpGet("api/publico/{token}/jornadas")]
    public async Task<IActionResult> Jornadas(string token)
        => await _publico.AbrirAsync(token) is int id ? Ok(await _publico.JornadasAsync(id)) : NotFound(NoDisponible);

    [AllowAnonymous, LimitarIntentos("publico")]
    [HttpGet("api/publico/{token}/grupos")]
    public async Task<IActionResult> Grupos(string token)
        => await _publico.AbrirAsync(token) is int id ? Ok(await _grupos.GetByCampeonatoAsync(id)) : NotFound(NoDisponible);

    [AllowAnonymous, LimitarIntentos("publico")]
    [HttpGet("api/publico/{token}/estadisticas/posiciones")]
    public async Task<IActionResult> Posiciones(string token, [FromQuery] int? idGrupo)
        => await _publico.AbrirAsync(token) is int id ? Ok(await _estadisticas.GetPosicionesAsync(id, idGrupo)) : NotFound(NoDisponible);

    [AllowAnonymous, LimitarIntentos("publico")]
    [HttpGet("api/publico/{token}/estadisticas/goleadores")]
    public async Task<IActionResult> Goleadores(string token, [FromQuery] int? top)
    {
        if (await _publico.AbrirAsync(token) is not int id) return NotFound(NoDisponible);
        var lista = await _estadisticas.GetGoleadoresAsync(id, top);
        return Ok(lista.Select(g => g with { FotoUrl = null }));
    }

    [AllowAnonymous, LimitarIntentos("publico")]
    [HttpGet("api/publico/{token}/estadisticas/tarjetas")]
    public async Task<IActionResult> Tarjetas(string token)
    {
        if (await _publico.AbrirAsync(token) is not int id) return NotFound(NoDisponible);
        var t = await _estadisticas.GetTarjetasAsync(id);
        return Ok(t with { PorJugador = t.PorJugador.Select(j => j with { FotoUrl = null }).ToList() });
    }

    [AllowAnonymous, LimitarIntentos("publico")]
    [HttpGet("api/publico/{token}/estadisticas/suspensiones")]
    public async Task<IActionResult> Suspensiones(string token)
    {
        if (await _publico.AbrirAsync(token) is not int id) return NotFound(NoDisponible);
        var s = await _estadisticas.GetSuspensionesAsync(id);
        return Ok(s with
        {
            Sanciones = s.Sanciones.Select(x => x with { FotoUrl = null }).ToList(),
            EnRiesgo  = s.EnRiesgo.Select(x => x with { FotoUrl = null }).ToList(),
        });
    }
}
