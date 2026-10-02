namespace LigaManager.Application.Interfaces;
using LigaManager.Application.Common;
using LigaManager.Application.DTOs.Estadisticas;

public interface IEstadisticasService
{
    Task<TablaPosicionesDto> GetPosicionesAsync(int idCampeonato, int? idGrupo);
    Task<List<GoleadorDto>>  GetGoleadoresAsync(int idCampeonato, int? top);
    Task<TarjetasDto>        GetTarjetasAsync(int idCampeonato);
    Task<SuspensionesDto>    GetSuspensionesAsync(int idCampeonato);

    Task<ServiceResult<SuspensionDto>> AgregarSancionManualAsync(int idCampeonato, AgregarSancionManualRequest req);
    Task<ServiceResult>                EliminarSancionManualAsync(int idCampeonato, int idSancion);
}
