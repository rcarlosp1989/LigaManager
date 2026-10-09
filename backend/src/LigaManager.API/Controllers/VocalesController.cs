namespace LigaManager.API.Controllers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using LigaManager.Application.DTOs.Partidos;
using LigaManager.Application.DTOs.Vocales;
using LigaManager.Application.Interfaces;
using LigaManager.Infrastructure.Services;

// Fase 7: vocales. Tres grupos de endpoints:
//  - /api/campeonatos/{id}/vocales …  para el organizador (política por defecto: rechaza vocales).
//  - /api/invitaciones/{codigo} …      públicos, para abrir y aceptar una invitación.
//  - /api/vocal/ …                     solo para el rol Vocal.
[ApiController]
public class VocalesController : ControllerBase
{
    private readonly VocalService    _vocales;
    private readonly IJornadaService _jornadas;
    public VocalesController(VocalService vocales, IJornadaService jornadas) { _vocales = vocales; _jornadas = jornadas; }

    private IActionResult Resultado<T>(Application.Common.ServiceResult<T> r) => r.Success ? Ok(r.Data) : BadRequest(new { error = r.Error });
    private IActionResult Resultado(Application.Common.ServiceResult r)       => r.Success ? NoContent() : BadRequest(new { error = r.Error });

    // Fase 8: un partido cerrado no acepta más registros del vocal (409). Corrige el organizador.
    private async Task<IActionResult?> SiCerrado(int? idPartido)
        => idPartido is int p && await _vocales.CerradoAsync(p)
            ? Conflict(new { error = "El partido está cerrado. Las correcciones las hace el organizador desde la planilla." })
            : null;

    // ── Organizador ──────────────────────────────────────────────────────────

    [Authorize]
    [HttpGet("api/campeonatos/{idCampeonato:int}/vocales")]
    public async Task<IActionResult> Listar(int idCampeonato) => Resultado(await _vocales.ListarAsync(idCampeonato));

    [Authorize]
    [HttpPost("api/campeonatos/{idCampeonato:int}/vocales/invitaciones")]
    public async Task<IActionResult> Invitar(int idCampeonato, [FromBody] CrearInvitacionRequest req)
        => Resultado(await _vocales.CrearInvitacionAsync(idCampeonato, req));

    [Authorize]
    [HttpDelete("api/campeonatos/{idCampeonato:int}/vocales/invitaciones/{idInvitacion:int}")]
    public async Task<IActionResult> Revocar(int idCampeonato, int idInvitacion)
        => Resultado(await _vocales.RevocarInvitacionAsync(idCampeonato, idInvitacion));

    [Authorize]
    [HttpDelete("api/campeonatos/{idCampeonato:int}/vocales/{idUsuario:int}")]
    public async Task<IActionResult> Quitar(int idCampeonato, int idUsuario)
        => Resultado(await _vocales.QuitarVocalAsync(idCampeonato, idUsuario));

    // ── Invitación (pública) ─────────────────────────────────────────────────

    [AllowAnonymous]
    [HttpGet("api/invitaciones/{codigo}")]
    public async Task<IActionResult> Consultar(string codigo)
    {
        var r = await _vocales.ConsultarAsync(codigo);
        return r.Success ? Ok(r.Data) : NotFound(new { error = r.Error });
    }

    [AllowAnonymous]
    [HttpPost("api/invitaciones/{codigo}/aceptar")]
    public async Task<IActionResult> Aceptar(string codigo, [FromBody] AceptarInvitacionRequest req)
        => Resultado(await _vocales.AceptarAsync(codigo, req));

    // ── Vocal ────────────────────────────────────────────────────────────────

    [Authorize(Policy = Politicas.SoloVocal)]
    [HttpGet("api/vocal/inicio")]
    public async Task<IActionResult> Inicio() => Ok(await _vocales.InicioAsync());

    [Authorize(Policy = Politicas.SoloVocal)]
    [HttpPost("api/vocal/campeonatos/{idCampeonato:int}/reemplazos")]
    public async Task<IActionResult> Delegar(int idCampeonato, [FromBody] DelegarRequest req)
        => Resultado(await _vocales.CrearInvitacionAsync(idCampeonato, new CrearInvitacionRequest("Reemplazo", req.Fecha)));

    [Authorize(Policy = Politicas.SoloVocal)]
    [HttpGet("api/vocal/partidos/{idPartido:int}")]
    public async Task<IActionResult> Partido(int idPartido)
    {
        var r = await _vocales.PartidoAsync(idPartido);
        return r.Success ? Ok(r.Data) : NotFound(new { error = r.Error });
    }

    // Las operaciones del partido reutilizan JornadaService; AccesoCampeonato limita al vocal
    // a los partidos de hoy de sus campeonatos.
    [Authorize(Policy = Politicas.SoloVocal)]
    [HttpPost("api/vocal/partidos/{idPartido:int}/alineacion")]
    public async Task<IActionResult> Convocar(int idPartido, [FromBody] AgregarAlineacionRequest req)
        => await SiCerrado(idPartido) ?? Resultado(await _jornadas.AgregarAlineacionAsync(idPartido, req));

    [Authorize(Policy = Politicas.SoloVocal)]
    [HttpDelete("api/vocal/alineacion/{idAlineacion:int}")]
    public async Task<IActionResult> QuitarConvocado(int idAlineacion)
        => await SiCerrado(await _vocales.PartidoDeAlineacionAsync(idAlineacion)) ?? Resultado(await _jornadas.EliminarAlineacionAsync(idAlineacion));

    [Authorize(Policy = Politicas.SoloVocal)]
    [HttpPost("api/vocal/partidos/{idPartido:int}/eventos")]
    public async Task<IActionResult> RegistrarEvento(int idPartido, [FromBody] RegistrarEventoRequest req)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        return await SiCerrado(idPartido) ?? Resultado(await _jornadas.RegistrarEventoAsync(idPartido, req));
    }

    [Authorize(Policy = Politicas.SoloVocal)]
    [HttpDelete("api/vocal/eventos/{idEvento:int}")]
    public async Task<IActionResult> EliminarEvento(int idEvento)
        => await SiCerrado(await _vocales.PartidoDeEventoAsync(idEvento)) ?? Resultado(await _jornadas.EliminarEventoAsync(idEvento));

    [Authorize(Policy = Politicas.SoloVocal)]
    [HttpPost("api/vocal/partidos/{idPartido:int}/cambios")]
    public async Task<IActionResult> RegistrarCambio(int idPartido, [FromBody] RegistrarCambioRequest req)
        => await SiCerrado(idPartido) ?? Resultado(await _jornadas.RegistrarCambioAsync(idPartido, req));

    [Authorize(Policy = Politicas.SoloVocal)]
    [HttpDelete("api/vocal/cambios/{idCambio:int}")]
    public async Task<IActionResult> EliminarCambio(int idCambio)
        => await SiCerrado(await _vocales.PartidoDeCambioAsync(idCambio)) ?? Resultado(await _jornadas.EliminarCambioAsync(idCambio));

    [Authorize(Policy = Politicas.SoloVocal)]
    [HttpPut("api/vocal/partidos/{idPartido:int}/cerrar")]
    public async Task<IActionResult> Cerrar(int idPartido, [FromBody] CerrarPartidoVocalRequest req)
        => await SiCerrado(idPartido) ?? Resultado(await _vocales.CerrarAsync(idPartido, req));

    [Authorize(Policy = Politicas.SoloVocal)]
    [HttpPut("api/vocal/partidos/{idPartido:int}/iniciar")]
    public async Task<IActionResult> Iniciar(int idPartido)
        => await SiCerrado(idPartido) ?? Resultado(await _jornadas.IniciarRegistroAsync(idPartido));
}

public static class Politicas
{
    public const string SoloVocal = "SoloVocal";
}
