namespace LigaManager.Application.Interfaces;
using LigaManager.Application.DTOs.Grupos;
using LigaManager.Application.Common;

public interface IGrupoService
{
    Task<List<GrupoListDto>>             GetByCampeonatoAsync(int idCampeonato);
    Task<List<PosicionGrupoDto>>         GetPosicionesCampeonatoAsync(int idCampeonato);
    Task<ServiceResult<GrupoDetalleDto>> GetByIdAsync(int id);
    Task<ServiceResult<GrupoListDto>>    CreateAsync(int idCampeonato, CreateGrupoRequest req);
    Task<ServiceResult<GrupoListDto>>    UpdateAsync(int id, UpdateGrupoRequest req);
    Task<ServiceResult>                  DeleteAsync(int id);

    // Equipos en grupo
    Task<ServiceResult<GrupoDetalleDto>> AsignarEquipoAsync(int idGrupo, int idEquipo);
    Task<ServiceResult<GrupoDetalleDto>> RemoverEquipoAsync(int idGrupo, int idEquipo);

    // Calendario automático
    Task<ServiceResult<string>>          GenerarCalendarioAsync(int idGrupo, GenerarCalendarioRequest req);

    // Fases del campeonato
    Task<List<FaseCampeonatoDto>>        GetFasesByCampeonatoAsync(int idCampeonato);
    Task<ServiceResult<FaseCampeonatoDto>> CreateFaseAsync(int idCampeonato, CreateFaseRequest req);
    Task<ServiceResult>                  DeleteFaseAsync(int id);
}
