namespace LigaManager.Application.Interfaces;

// Dónde se guardan logos y fotos. Hoy: en la base de datos (AlmacenImagenesBd).
// Si la app crece, se reemplaza esta pieza por un almacenamiento de archivos (por ejemplo
// Cloudflare R2) sin cambiar pantallas ni servicios: todos usan la dirección que devuelve.
public interface IAlmacenImagenes
{
    // Guarda la imagen y devuelve su dirección pública, por ejemplo «/api/imagenes/3f9a…».
    Task<string> GuardarAsync(byte[] datos, string tipoMime);
    Task<(byte[] Datos, string TipoMime)?> ObtenerAsync(string id);
    // Borra la imagen de una dirección devuelta por GuardarAsync. Otras direcciones se ignoran.
    Task BorrarAsync(string? url);
}
