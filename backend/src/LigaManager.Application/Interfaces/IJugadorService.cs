namespace LigaManager.Application.Interfaces;
using LigaManager.Application.DTOs.Jugadores;
using LigaManager.Application.Common;

public interface IJugadorService
{
    Task<List<JugadorListDto>>             GetAllAsync(int? equipoId);
    Task<ServiceResult<JugadorDetalleDto>> GetByIdAsync(int id);
    Task<ServiceResult<JugadorDetalleDto>> CreateAsync(CreateJugadorRequest req);
    Task<ServiceResult<JugadorDetalleDto>> UpdateAsync(int id, UpdateJugadorRequest req);
    Task<ServiceResult>                    UpdateDorsalAsync(int idJugador, UpdateDorsalRequest req);
    Task<ServiceResult>                    DeleteAsync(int id);
    Task<ServiceResult>                    VincularEquipoAsync(int idJugador, VincularEquipoRequest req);
    Task<ServiceResult>                    CerrarVinculoAsync(int idJugador, int idJugadorEquipo, string fechaHasta);
}
