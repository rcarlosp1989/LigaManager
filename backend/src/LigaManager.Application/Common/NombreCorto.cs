namespace LigaManager.Application.Common;

// Nombre corto de una persona: primer nombre y primer apellido.
// «Carlos Andrés» «Mendoza Pérez» → «Carlos Mendoza».
// Respeta los apellidos con partícula: «De la Cruz Pérez» → «De la Cruz», «Del Pezo» → «Del Pezo».
public static class NombreCorto
{
    private static readonly HashSet<string> Particulas = new(StringComparer.OrdinalIgnoreCase)
    {
        "de", "del", "la", "las", "los", "da", "das", "do", "dos", "di", "van", "von", "y", "san", "santa", "mc", "mac",
    };

    private static string[] Palabras(string? texto)
        => (texto ?? "").Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    public static string PrimerNombre(string? nombre)
    {
        var p = Palabras(nombre);
        return p.Length == 0 ? "" : p[0];
    }

    public static string PrimerApellido(string? apellido)
    {
        var p = Palabras(apellido);
        if (p.Length == 0) return "";
        var partes = new List<string>();
        foreach (var palabra in p)
        {
            partes.Add(palabra);
            if (!Particulas.Contains(palabra)) break;   // las partículas se juntan con la palabra siguiente
        }
        return string.Join(' ', partes);
    }

    public static string De(string? nombre, string? apellido)
        => $"{PrimerNombre(nombre)} {PrimerApellido(apellido)}".Trim();
}
