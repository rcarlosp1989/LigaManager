namespace LigaManager.Application.Interfaces;
using LigaManager.Application.DTOs.Estadios;
using LigaManager.Application.Common;

public interface IEstadioService
{
    Task<List<EstadioListDto>>             GetAllAsync();
    Task<ServiceResult<EstadioListDto>>    CreateAsync(CreateEstadioRequest req);
    Task<ServiceResult<EstadioListDto>>    UpdateAsync(int id, UpdateEstadioRequest req);
    Task<ServiceResult>                    DeleteAsync(int id);
}
