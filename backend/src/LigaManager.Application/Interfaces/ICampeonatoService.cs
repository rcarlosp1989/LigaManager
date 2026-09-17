namespace LigaManager.Application.Interfaces;
using LigaManager.Application.DTOs.Campeonatos;
using LigaManager.Application.Common;

public interface ICampeonatoService
{
    Task<List<CampeonatoListDto>>             GetAllAsync();
    Task<ServiceResult<CampeonatoDetalleDto>> GetByIdAsync(int id);
    Task<ServiceResult<CampeonatoDetalleDto>> CreateAsync(CreateCampeonatoRequest request);
    Task<ServiceResult<CampeonatoDetalleDto>> UpdateAsync(int id, UpdateCampeonatoRequest request);
    Task<ServiceResult>                       DeleteAsync(int id);
    Task<ServiceResult>                       AgregarEquipoAsync(int idCampeonato, int idEquipo);
    Task<ServiceResult>                       RemoverEquipoAsync(int idCampeonato, int idEquipo);
}