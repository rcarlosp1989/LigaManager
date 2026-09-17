// ─────────────────────────────────────────────────────────────────────────────
// Archivo: DTOs/Campeonatos/
// =============================================================================

// CampeonatoDtos.cs
namespace LigaManager.Application.DTOs.Campeonatos;

public record CampeonatoListDto(
    int    IdCampeonato,
    string Nombre,
    int    Anio,
    string FechaInicio,
    string FechaFin,
    string Estado,
    string TipoPartido,
    int    TotalEquipos
);