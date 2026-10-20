namespace LigaManager.Application.Common;

// Documento de identidad de un jugador o árbitro.
//  - Cedula:     cédula ecuatoriana, 10 números con provincia y dígito verificador válidos.
//  - Extranjero: documento de otro país (cédula, DNI…), solo números, de 5 a 15.
//  - Pasaporte:  letras y números, sin espacios ni símbolos, de 5 a 20; se guarda en mayúsculas.
//  - Pendiente:  todavía no se conoce; se guarda sin número (solo jugadores) y se completa después.
public static class Identificacion
{
    public static readonly string[] Tipos = { "Cedula", "Extranjero", "Pasaporte", "Pendiente" };

    // Devuelve el tipo y el número listos para guardar, o el mensaje de error.
    public static (string Tipo, string Numero, string? Error) Validar(string? tipo, string? numero)
    {
        var t = Tipos.FirstOrDefault(x => string.Equals(x, tipo?.Trim(), StringComparison.OrdinalIgnoreCase))
                ?? (string.IsNullOrWhiteSpace(tipo) ? "Cedula" : null);
        if (t is null) return ("", "", "Tipo de documento inválido. Usa Cédula, Extranjero, Pasaporte o Pendiente.");
        if (t == "Pendiente") return (t, "", null);   // sin número: se completa al tenerlo

        // Se toleran espacios y guiones al escribir.
        var n = new string((numero ?? "").Where(c => c != ' ' && c != '-').ToArray()).ToUpperInvariant();
        if (n.Length == 0) return (t, n, "El número de documento es obligatorio.");

        switch (t)
        {
            case "Cedula":
                if (n.Length != 10 || !n.All(char.IsAsciiDigit))
                    return (t, n, "La cédula debe tener exactamente 10 números, sin letras.");
                if (!CedulaEcuatorianaValida(n))
                    return (t, n, "La cédula no es válida: revisa los números (el dígito verificador no coincide).");
                break;
            case "Extranjero":
                if (n.Length is < 5 or > 15 || !n.All(char.IsAsciiDigit))
                    return (t, n, "El documento extranjero debe tener solo números, entre 5 y 15.");
                break;
            default:
                if (n.Length is < 5 or > 20 || !n.All(char.IsAsciiLetterOrDigit))
                    return (t, n, "El pasaporte debe tener entre 5 y 20 letras o números, sin espacios ni símbolos.");
                break;
        }
        return (t, n, null);
    }

    // Algoritmo del Registro Civil: provincia 01-24 o 30, tercer dígito menor a 6 y
    // verificador módulo 10 con coeficientes 2,1,2,1…
    public static bool CedulaEcuatorianaValida(string c)
    {
        if (c.Length != 10 || !c.All(char.IsAsciiDigit)) return false;
        var provincia = (c[0] - '0') * 10 + (c[1] - '0');
        if (!((provincia >= 1 && provincia <= 24) || provincia == 30)) return false;
        if (c[2] - '0' >= 6) return false;
        var suma = 0;
        for (var i = 0; i < 9; i++)
        {
            var v = (c[i] - '0') * (i % 2 == 0 ? 2 : 1);
            suma += v > 9 ? v - 9 : v;
        }
        return (10 - suma % 10) % 10 == c[9] - '0';
    }
}
