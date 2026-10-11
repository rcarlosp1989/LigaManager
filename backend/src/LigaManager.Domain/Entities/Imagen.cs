namespace LigaManager.Domain.Entities;

// Imagen guardada por la app (logo de equipo o foto de jugador). El código es aleatorio
// para que no se puedan recorrer las fotos probando números. Ver IAlmacenImagenes.
public class Imagen
{
    public string   IdImagen         { get; set; } = null!;   // 32 caracteres hexadecimales
    public byte[]   Contenido        { get; set; } = null!;
    public string   TipoMime         { get; set; } = null!;   // image/jpeg | image/png | image/webp
    public int      Bytes            { get; set; }
    public int?     IdUsuarioCreador { get; set; }
    public DateTime CreadoEn         { get; set; }
}
