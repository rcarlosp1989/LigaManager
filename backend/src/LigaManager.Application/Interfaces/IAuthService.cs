namespace LigaManager.Application.Interfaces;
using LigaManager.Application.DTOs.Auth;
using LigaManager.Application.Common;

public interface IAuthService
{
    Task<ServiceResult<LoginResponse>> LoginAsync(LoginRequest request);
    Task<ServiceResult<LoginResponse>> RegisterAsync(RegisterRequest request);
    Task<TerminosDto?> TerminosAsync(int idUsuario);
    Task<ServiceResult<TerminosDto>> AceptarTerminosAsync(int idUsuario, AceptarTerminosRequest req);
}