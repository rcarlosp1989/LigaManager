namespace LigaManager.Application.Interfaces;
using LigaManager.Application.DTOs.Estadisticas;

public interface IEstadisticasService
{
    Task<TablaPosicionesDto> GetPosicionesAsync(int idCampeonato, int? idGrupo);
    Task<List<GoleadorDto>>  GetGoleadoresAsync(int idCampeonato, int? top);
    Task<TarjetasDto>        GetTarjetasAsync(int idCampeonato);
    Task<SuspensionesDto>    GetSuspensionesAsync(int idCampeonato);
}
