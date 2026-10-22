namespace LigaManager.Application.Interfaces;
using LigaManager.Application.DTOs.Auth;
using LigaManager.Application.Common;

public interface IAuthService
{
    Task<ServiceResult<LoginResponse>> LoginAsync(LoginRequest request);
    Task<ServiceResult<RegistroResultado>> RegisterAsync(RegisterRequest request);
    OpcionesAuthDto Opciones();
    Task<ServiceResult<LoginResponse>> ConfirmarCorreoAsync(string token);
    Task ReenviarConfirmacionAsync(string email);
    Task OlvideClaveAsync(string email);
    Task<EnlaceValidoDto> ValidarRestablecerAsync(string token);
    Task<ServiceResult<LoginResponse>> RestablecerAsync(RestablecerRequest req);
    Task<TerminosDto?> TerminosAsync(int idUsuario);
    Task<ServiceResult<TerminosDto>> AceptarTerminosAsync(int idUsuario, AceptarTerminosRequest req);
}