namespace LigaManager.Application.Interfaces;
using LigaManager.Application.DTOs.Jornadas;
using LigaManager.Application.DTOs.Partidos;
using LigaManager.Application.Common;

public interface IJornadaService
{
    Task<List<JornadaListDto>>             GetByCampeonatoAsync(int idCampeonato);
    Task<ServiceResult<JornadaDetalleDto>> GetByIdAsync(int id);
    Task<ServiceResult<JornadaDetalleDto>> CreateAsync(int idCampeonato, CreateJornadaRequest req);
    Task<ServiceResult>                    DeleteAsync(int id);

    Task<ServiceResult<PartidoDetalleDto>> AgregarPartidoAsync(int idJornada, CreatePartidoRequest req);
    Task<ServiceResult<PartidoDetalleDto>> MarcarJugadoAsync(int idPartido, MarcarJugadoRequest req);
    Task<ServiceResult<PartidoDetalleDto>> EditarPartidoAsync(int idPartido, EditarPartidoRequest req);
    Task<ServiceResult<PartidoDetalleDto>> RegistrarEventoAsync(int idPartido, RegistrarEventoRequest req);
    Task<ServiceResult>                    EliminarEventoAsync(int idEvento);
    Task<ServiceResult>                    EliminarPartidoAsync(int idPartido);
}