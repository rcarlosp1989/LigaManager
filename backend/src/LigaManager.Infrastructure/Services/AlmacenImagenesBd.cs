namespace LigaManager.Infrastructure.Services;
using System.Security.Claims;
using System.Security.Cryptography;
using LigaManager.Application.Common;
using LigaManager.Application.Interfaces;
using LigaManager.Domain.Entities;
using LigaManager.Infrastructure.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

// Implementación de IAlmacenImagenes que guarda las imágenes en la tabla «imagen» de MySQL.
public class AlmacenImagenesBd : IAlmacenImagenes
{
    private readonly LigaManagerContext _db;
    private readonly IHttpContextAccessor _http;
    public AlmacenImagenesBd(LigaManagerContext db, IHttpContextAccessor http) { _db = db; _http = http; }

    public async Task<string> GuardarAsync(byte[] datos, string tipoMime)
    {
        var id = Convert.ToHexString(RandomNumberGenerator.GetBytes(16)).ToLowerInvariant();
        _db.Imagenes.Add(new Imagen
        {
            IdImagen = id, Contenido = datos, TipoMime = tipoMime, Bytes = datos.Length,
            IdUsuarioCreador = int.TryParse(_http.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier), out var u) ? u : null,
            CreadoEn = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();
        return ArchivoImagen.PrefijoUrl + id;
    }

    public async Task<(byte[] Datos, string TipoMime)?> ObtenerAsync(string id)
    {
        var img = await _db.Imagenes.AsNoTracking()
            .Where(i => i.IdImagen == id)
            .Select(i => new { i.Contenido, i.TipoMime })
            .FirstOrDefaultAsync();
        return img is null ? null : (img.Contenido, img.TipoMime);
    }

    public async Task BorrarAsync(string? url)
    {
        var id = ArchivoImagen.IdDesdeUrl(url);
        if (id is null) return;
        await _db.Imagenes.Where(i => i.IdImagen == id).ExecuteDeleteAsync();
    }
}
