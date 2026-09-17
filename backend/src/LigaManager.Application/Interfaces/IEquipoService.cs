namespace LigaManager.Application.Interfaces;
using LigaManager.Application.DTOs.Equipos;
using LigaManager.Application.Common;

public interface IEquipoService
{
    Task<List<EquipoListDto>>             GetAllAsync();
    Task<ServiceResult<EquipoDetalleDto>> GetByIdAsync(int id, DateOnly? fecha = null);
    Task<ServiceResult<EquipoDetalleDto>> CreateAsync(CreateEquipoRequest req);
    Task<ServiceResult<EquipoDetalleDto>> UpdateAsync(int id, UpdateEquipoRequest req);
    Task<ServiceResult>                   DeleteAsync(int id);
}