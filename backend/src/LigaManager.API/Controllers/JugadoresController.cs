namespace LigaManager.API.Controllers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using LigaManager.Application.Interfaces;
using LigaManager.Application.Common;
using LigaManager.Application.DTOs.Jugadores;

[ApiController]
[Route("api/jugadores")]
[Authorize]
public class JugadoresController : ControllerBase
{
    private readonly IJugadorService _service;
    private readonly IWebHostEnvironment _environment;
    private readonly IAlmacenImagenes _imagenes;
    public JugadoresController(IJugadorService service, IWebHostEnvironment environment, IAlmacenImagenes imagenes)
    {
        _service = service;
        _environment = environment;
        _imagenes = imagenes;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? equipoId)
        => Ok(await _service.GetAllAsync(equipoId));

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _service.GetByIdAsync(id);
        return result.Success ? Ok(result.Data) : NotFound(new { error = result.Error });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromForm] CreateJugadorForm form)
    {
        var fotoUrl = await SavePhotoAsync(form.Foto);
        var request = new CreateJugadorRequest(
            form.Nombre, form.Apellido, form.Cedula ?? "", form.FechaNac, form.IdPais, form.IdCanton,
            form.IdEquipo, form.FechaDesde, form.Dorsal, form.Posicion, fotoUrl, form.TipoIdentificacion, form.AutorizacionDatos);
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var result = await _service.CreateAsync(request);
        if (!result.Success) { await _imagenes.BorrarAsync(fotoUrl); return BadRequest(new { error = result.Error }); }
        return CreatedAtAction(nameof(GetById), new { id = result.Data!.IdJugador }, result.Data);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromForm] UpdateJugadorForm form)
    {
        var fotoUrl = await SavePhotoAsync(form.Foto);
        var request = new UpdateJugadorRequest(
            form.Nombre, form.Apellido, form.Cedula ?? "", form.FechaNac, form.IdPais, form.IdCanton, fotoUrl, form.Posicion, form.Dorsal, form.TipoIdentificacion);
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var result = await _service.UpdateAsync(id, request);
        if (!result.Success) await _imagenes.BorrarAsync(fotoUrl);
        return result.Success ? Ok(result.Data) : BadRequest(new { error = result.Error });
    }

    [HttpPatch("{id:int}/dorsal")]
    public async Task<IActionResult> UpdateDorsal(int id, [FromBody] UpdateDorsalRequest request)
    {
        var result = await _service.UpdateDorsalAsync(id, request);
        return result.Success ? Ok() : BadRequest(new { error = result.Error });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _service.DeleteAsync(id);
        return result.Success ? NoContent() : BadRequest(new { error = result.Error });
    }

    [HttpPost("{id:int}/vincular-equipo")]
    public async Task<IActionResult> VincularEquipo(int id, [FromBody] VincularEquipoRequest request)
    {
        var result = await _service.VincularEquipoAsync(id, request);
        return result.Success ? Ok() : BadRequest(new { error = result.Error });
    }

    [HttpPatch("{id:int}/vinculos/{idVinculo:int}/cerrar")]
    public async Task<IActionResult> CerrarVinculo(int id, int idVinculo, [FromQuery] string fechaHasta)
    {
        var result = await _service.CerrarVinculoAsync(id, idVinculo, fechaHasta);
        return result.Success ? Ok() : BadRequest(new { error = result.Error });
    }

    // Foto del jugador: la pantalla la achica antes de subirla (512 px). Se guarda en el almacén
    // de imágenes (la base de datos), no en una carpeta del servidor, que Railway borra al publicar.
    private async Task<string?> SavePhotoAsync(IFormFile? photo)
    {
        if (photo is null || photo.Length == 0) return null;
        if (photo.Length > 1024 * 1024)
            throw new BadHttpRequestException("La foto no puede superar 1 MB. La app la achica sola: vuelve a elegirla.");

        var allowed = new[] { ".jpg", ".jpeg", ".png", ".webp" };
        if (!allowed.Contains(Path.GetExtension(photo.FileName).ToLowerInvariant()))
            throw new BadHttpRequestException("La foto debe ser JPG, PNG o WEBP.");

        using var ms = new MemoryStream();
        await photo.CopyToAsync(ms);
        var datos = ms.ToArray();
        var tipo = ArchivoImagen.TipoMime(datos)
            ?? throw new BadHttpRequestException("El archivo no es una imagen JPG, PNG o WEBP válida.");
        return await _imagenes.GuardarAsync(datos, tipo);
    }
}


public sealed class CreateJugadorForm
{
    public string Nombre { get; set; } = "";
    public string Apellido { get; set; } = "";
    public string? Cedula { get; set; }   // vacío si el documento está pendiente
    public string? TipoIdentificacion { get; set; }
    public string FechaNac { get; set; } = "";
    public int IdPais { get; set; }
    public int? IdCanton { get; set; }
    public int IdEquipo { get; set; }
    public string FechaDesde { get; set; } = "";
    public int? Dorsal { get; set; }
    public string? Posicion { get; set; }
    public IFormFile? Foto { get; set; }
    public bool AutorizacionDatos { get; set; }
}

public sealed class UpdateJugadorForm
{
    public string Nombre { get; set; } = "";
    public string Apellido { get; set; } = "";
    public string? Cedula { get; set; }   // vacío si el documento está pendiente
    public string? TipoIdentificacion { get; set; }
    public string FechaNac { get; set; } = "";
    public int IdPais { get; set; }
    public int? IdCanton { get; set; }
    public IFormFile? Foto { get; set; }
    public string? Posicion { get; set; }
    public int? Dorsal { get; set; }
}
