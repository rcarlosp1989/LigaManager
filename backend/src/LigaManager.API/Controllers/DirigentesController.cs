namespace LigaManager.API.Controllers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using LigaManager.Application.DTOs.Dirigentes;
using LigaManager.Application.DTOs.Vocales;
using LigaManager.Application.Interfaces;
using LigaManager.Infrastructure.Services;
using LigaManager.API.Seguridad;

// Dirigentes (solo lectura). Tres grupos de endpoints:
//  - /api/campeonatos/{id}/dirigentes …        para el organizador (política por defecto).
//  - /api/invitaciones-dirigente/{codigo} …     públicos, para abrir y aceptar una invitación.
//  - /api/dirigente/ …                          solo para el rol Dirigente, y solo GET.
//
// Los reportes reutilizan los servicios de siempre: AccesoCampeonato les permite leer al
// dirigente habilitado en el campeonato. La nómina va por DirigenteService, que solo envía
// los documentos de identidad de su propio equipo.
[ApiController]
public class DirigentesController : ControllerBase
{
    private readonly DirigenteService     _dirigentes;
    private readonly IEstadisticasService _estadisticas;
    private readonly IGrupoService        _grupos;
    private readonly IJornadaService      _jornadas;
    private readonly EnVivoService        _enVivo;

    public DirigentesController(DirigenteService dirigentes, IEstadisticasService estadisticas, IGrupoService grupos, IJornadaService jornadas, EnVivoService enVivo)
    {
        _dirigentes = dirigentes; _estadisticas = estadisticas; _grupos = grupos; _jornadas = jornadas; _enVivo = enVivo;
    }

    private IActionResult Resultado<T>(Application.Common.ServiceResult<T> r) => r.Success ? Ok(r.Data) : BadRequest(new { error = r.Error });
    private IActionResult Resultado(Application.Common.ServiceResult r)       => r.Success ? NoContent() : BadRequest(new { error = r.Error });
    private IActionResult NoEncontrado<T>(Application.Common.ServiceResult<T> r) => r.Success ? Ok(r.Data) : NotFound(new { error = r.Error });

    // ── Organizador ──────────────────────────────────────────────────────────

    [Authorize]
    [HttpGet("api/campeonatos/{idCampeonato:int}/dirigentes")]
    public async Task<IActionResult> Listar(int idCampeonato) => Resultado(await _dirigentes.ListarAsync(idCampeonato));

    [Authorize]
    [HttpPost("api/campeonatos/{idCampeonato:int}/dirigentes/invitaciones")]
    public async Task<IActionResult> Invitar(int idCampeonato, [FromBody] CrearInvitacionDirigenteRequest req)
        => Resultado(await _dirigentes.CrearInvitacionAsync(idCampeonato, req));

    [Authorize]
    [HttpDelete("api/campeonatos/{idCampeonato:int}/dirigentes/invitaciones/{idInvitacion:int}")]
    public async Task<IActionResult> Anular(int idCampeonato, int idInvitacion)
        => Resultado(await _dirigentes.RevocarInvitacionAsync(idCampeonato, idInvitacion));

    [Authorize]
    [HttpDelete("api/campeonatos/{idCampeonato:int}/dirigentes/{idUsuario:int}")]
    public async Task<IActionResult> Quitar(int idCampeonato, int idUsuario)
        => Resultado(await _dirigentes.QuitarAsync(idCampeonato, idUsuario));

    // ── Invitación (pública) ─────────────────────────────────────────────────

    [AllowAnonymous]
    [LimitarIntentos("invitacion")]
    [HttpGet("api/invitaciones-dirigente/{codigo}")]
    public async Task<IActionResult> Consultar(string codigo) => NoEncontrado(await _dirigentes.ConsultarAsync(codigo));

    [AllowAnonymous]
    [LimitarIntentos("invitacion")]
    [HttpPost("api/invitaciones-dirigente/{codigo}/aceptar")]
    public async Task<IActionResult> Aceptar(string codigo, [FromBody] AceptarInvitacionRequest req)
        => Resultado(await _dirigentes.AceptarAsync(codigo, req));

    // ── Dirigente (solo lectura) ─────────────────────────────────────────────

    [Authorize(Policy = Politicas.SoloDirigente)]
    [HttpGet("api/dirigente/inicio")]
    public async Task<IActionResult> Inicio() => Ok(await _dirigentes.InicioAsync());

    [Authorize(Policy = Politicas.SoloDirigente)]
    [HttpGet("api/dirigente/campeonatos/{idCampeonato:int}")]
    public async Task<IActionResult> Campeonato(int idCampeonato) => NoEncontrado(await _dirigentes.CampeonatoAsync(idCampeonato));

    [Authorize(Policy = Politicas.SoloDirigente)]
    [HttpGet("api/dirigente/campeonatos/{idCampeonato:int}/equipos/{idEquipo:int}")]
    public async Task<IActionResult> Nomina(int idCampeonato, int idEquipo) => NoEncontrado(await _dirigentes.NominaAsync(idCampeonato, idEquipo));

    [Authorize(Policy = Politicas.SoloDirigente)]
    [HttpGet("api/dirigente/campeonatos/{idCampeonato:int}/grupos")]
    public async Task<IActionResult> Grupos(int idCampeonato) => Ok(await _grupos.GetByCampeonatoAsync(idCampeonato));

    [Authorize(Policy = Politicas.SoloDirigente)]
    [HttpGet("api/dirigente/campeonatos/{idCampeonato:int}/estadisticas/posiciones")]
    public async Task<IActionResult> Posiciones(int idCampeonato, [FromQuery] int? idGrupo)
        => Ok(await _estadisticas.GetPosicionesAsync(idCampeonato, idGrupo));

    [Authorize(Policy = Politicas.SoloDirigente)]
    [HttpGet("api/dirigente/campeonatos/{idCampeonato:int}/estadisticas/goleadores")]
    public async Task<IActionResult> Goleadores(int idCampeonato, [FromQuery] int? top)
        => Ok(await _estadisticas.GetGoleadoresAsync(idCampeonato, top));

    [Authorize(Policy = Politicas.SoloDirigente)]
    [HttpGet("api/dirigente/campeonatos/{idCampeonato:int}/estadisticas/tarjetas")]
    public async Task<IActionResult> Tarjetas(int idCampeonato) => Ok(await _estadisticas.GetTarjetasAsync(idCampeonato));

    [Authorize(Policy = Politicas.SoloDirigente)]
    [HttpGet("api/dirigente/campeonatos/{idCampeonato:int}/estadisticas/suspensiones")]
    public async Task<IActionResult> Suspensiones(int idCampeonato) => Ok(await _estadisticas.GetSuspensionesAsync(idCampeonato));

    [Authorize(Policy = Politicas.SoloDirigente)]
    [HttpGet("api/dirigente/campeonatos/{idCampeonato:int}/en-vivo")]
    public async Task<IActionResult> EnVivo(int idCampeonato)
        => await _enVivo.ConsultarAsync(idCampeonato) is { } r ? Ok(r) : NotFound(new { error = "Campeonato no encontrado." });

    [Authorize(Policy = Politicas.SoloDirigente)]
    [HttpGet("api/dirigente/campeonatos/{idCampeonato:int}/jornadas")]
    public async Task<IActionResult> Jornadas(int idCampeonato) => Ok(await _jornadas.GetByCampeonatoAsync(idCampeonato));

    [Authorize(Policy = Politicas.SoloDirigente)]
    [HttpGet("api/dirigente/campeonatos/{idCampeonato:int}/jornadas/{idJornada:int}")]
    public async Task<IActionResult> Jornada(int idCampeonato, int idJornada)
    {
        if (!await _dirigentes.JornadaDelCampeonatoAsync(idCampeonato, idJornada)) return NotFound(new { error = "Jornada no encontrada." });
        return NoEncontrado(await _jornadas.GetByIdAsync(idJornada));
    }
}
