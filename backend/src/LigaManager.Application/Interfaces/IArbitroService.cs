namespace LigaManager.Application.Interfaces;
using LigaManager.Application.DTOs.Arbitros;
using LigaManager.Application.Common;

public interface IArbitroService
{
    Task<List<ArbitroListDto>>             GetAllAsync();
    Task<ServiceResult<ArbitroDetalleDto>> GetByIdAsync(int id);
    Task<ServiceResult<ArbitroDetalleDto>> CreateAsync(CreateArbitroRequest req);
    Task<ServiceResult>                    DeleteAsync(int id);
}
