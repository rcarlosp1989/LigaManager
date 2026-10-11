namespace LigaManager.Application.Common;

// Reconoce una imagen por sus primeros bytes (no por el nombre del archivo).
public static class ArchivoImagen
{
    public const string PrefijoUrl = "/api/imagenes/";

    public static string? TipoMime(byte[] b)
    {
        if (b.Length >= 3 && b[0] == 0xFF && b[1] == 0xD8 && b[2] == 0xFF) return "image/jpeg";
        if (b.Length >= 8 && b[0] == 0x89 && b[1] == 0x50 && b[2] == 0x4E && b[3] == 0x47
            && b[4] == 0x0D && b[5] == 0x0A && b[6] == 0x1A && b[7] == 0x0A) return "image/png";
        if (b.Length >= 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
            && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') return "image/webp";
        return null;
    }

    // «/api/imagenes/3f9a…» → «3f9a…»; null si no es una imagen guardada por la app.
    public static string? IdDesdeUrl(string? url)
    {
        if (url is null || !url.StartsWith(PrefijoUrl, StringComparison.Ordinal)) return null;
        var id = url[PrefijoUrl.Length..];
        return id.Length == 32 && id.All(Uri.IsHexDigit) ? id : null;
    }
}
