namespace LigaManager.API.Controllers;
using LigaManager.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

// Sirve logos y fotos. Es pública porque una etiqueta <img> no puede mandar la sesión;
// el código de cada imagen es aleatorio (no se puede adivinar). Una imagen nunca cambia
// (al reemplazarla se crea otra con otro código), así que se puede guardar en caché un año.
[ApiController]
public class ImagenesController : ControllerBase
{
    private readonly IAlmacenImagenes _almacen;
    public ImagenesController(IAlmacenImagenes almacen) => _almacen = almacen;

    [AllowAnonymous]
    [HttpGet("api/imagenes/{id:length(32)}")]
    public async Task<IActionResult> Obtener(string id)
    {
        var img = await _almacen.ObtenerAsync(id.ToLowerInvariant());
        if (img is null) return NotFound();
        Response.Headers.CacheControl = "public, max-age=31536000, immutable";
        // La copia guardada depende del origen: la que pidió una etiqueta <img> (sin permiso CORS)
        // no sirve para dibujar el logo en el flyer.
        Response.Headers.Vary = "Origin";
        return File(img.Value.Datos, img.Value.TipoMime);
    }
}
