namespace LigaManager.Application.Interfaces;

// Envío de correos de la aplicación (confirmar correo, restablecer contraseña).
// Habilitado: hay un servicio configurado (Brevo, o el envío de prueba). Si no, la app no exige
// confirmar el correo y no ofrece restablecer la contraseña.
public interface IEnvioCorreo
{
    bool Habilitado { get; }
    Task<bool> EnviarAsync(string para, string nombre, string asunto, string html, string texto);
}
