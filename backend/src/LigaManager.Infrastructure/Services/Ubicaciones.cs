namespace LigaManager.Infrastructure.Services;
using LigaManager.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

// Valida la ubicación de una persona o estadio: siempre un país; y, si ese país tiene provincias
// cargadas (hoy Ecuador), también un cantón que pertenezca a él. Para países sin provincias
// (extranjeros) el cantón se ignora y queda vacío.
public class Ubicaciones
{
    private readonly LigaManagerContext _db;
    public Ubicaciones(LigaManagerContext db) => _db = db;

    public async Task<(int? IdCanton, string? Error)> ValidarAsync(int idPais, int? idCanton)
    {
        if (!await _db.Paises.AnyAsync(p => p.IdPais == idPais))
            return (null, "País no encontrado.");

        if (!await _db.Provincias.AnyAsync(p => p.IdPais == idPais))
            return (null, null);

        if (idCanton is null)
            return (null, "Selecciona la provincia y el cantón.");

        if (!await _db.Cantones.AnyAsync(c => c.IdCanton == idCanton && c.Provincia.IdPais == idPais))
            return (null, "El cantón no pertenece al país seleccionado.");

        return (idCanton, null);
    }
}
