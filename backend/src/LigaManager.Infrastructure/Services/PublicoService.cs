namespace LigaManager.Infrastructure.Services;
using System.Security.Cryptography;
using LigaManager.Application.Common;
using LigaManager.Application.DTOs.Dirigentes;
using LigaManager.Application.DTOs.Publico;
using LigaManager.Domain.Entities;
using LigaManager.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

// Enlace público del campeonato: solo lectura, sin cuenta.
//
// - El organizador lo crea, lo cambia (el anterior deja de funcionar) o lo desactiva.
// - Con el enlace se ven posiciones, resultados, goleadores, tarjetas y sanciones. Nada de
//   nóminas, documentos, fechas de nacimiento ni fotos; los jugadores con nombre corto.
// - El enlace es un código aleatorio de 22 caracteres: no se puede adivinar.
public class PublicoService
{
    private const string Alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

    private readonly LigaManagerContext _db;
    private readonly AccesoCampeonato   _acceso;
    public PublicoService(LigaManagerContext db, AccesoCampeonato acceso) { _db = db; _acceso = acceso; }

    private static string NuevoToken()
    {
        var c = new char[22];
        for (var i = 0; i < c.Length; i++) c[i] = Alfabeto[RandomNumberGenerator.GetInt32(Alfabeto.Length)];
        return new string(c);
    }

    // ── Organizador ──────────────────────────────────────────────────────────

    public async Task<ServiceResult<EnlacePublicoDto>> ConsultarAsync(int idCampeonato)
    {
        if (!await _acceso.CampeonatoAsync(idCampeonato)) return ServiceResult<EnlacePublicoDto>.Fail("Campeonato no encontrado.");
        var token = await _db.Campeonatos.Where(c => c.IdCampeonato == idCampeonato).Select(c => c.TokenPublico).FirstAsync();
        return ServiceResult<EnlacePublicoDto>.Ok(new EnlacePublicoDto(token));
    }

    // Crea el enlace o lo cambia por uno nuevo (el anterior deja de funcionar).
    public async Task<ServiceResult<EnlacePublicoDto>> GenerarAsync(int idCampeonato)
    {
        if (!await _acceso.CampeonatoAsync(idCampeonato)) return ServiceResult<EnlacePublicoDto>.Fail("Campeonato no encontrado.");
        var c = await _db.Campeonatos.FirstAsync(x => x.IdCampeonato == idCampeonato);
        c.TokenPublico = NuevoToken();
        await _db.SaveChangesAsync();
        return ServiceResult<EnlacePublicoDto>.Ok(new EnlacePublicoDto(c.TokenPublico));
    }

    public async Task<ServiceResult> DesactivarAsync(int idCampeonato)
    {
        if (!await _acceso.CampeonatoAsync(idCampeonato)) return ServiceResult.Fail("Campeonato no encontrado.");
        var c = await _db.Campeonatos.FirstAsync(x => x.IdCampeonato == idCampeonato);
        c.TokenPublico = null;
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    // ── Público ──────────────────────────────────────────────────────────────

    // Campeonato del enlace, o null si no existe o está desactivado. Si existe, habilita la
    // lectura de ese campeonato para esta petición (AccesoCampeonato).
    public async Task<int?> AbrirAsync(string token)
    {
        if (string.IsNullOrEmpty(token) || token.Length != 22 || !token.All(char.IsAsciiLetterOrDigit)) return null;
        var id = await _db.Campeonatos.Where(c => c.TokenPublico == token).Select(c => (int?)c.IdCampeonato).FirstOrDefaultAsync();
        if (id is int i) _acceso.PermitirLecturaPublica(i);
        return id;
    }

    public async Task<PublicoCampeonatoDto> CampeonatoAsync(int idCampeonato)
    {
        var c = await _db.Campeonatos
            .Include(x => x.ModalidadDeportiva)
            .Include(x => x.Equipos).ThenInclude(ce => ce.Equipo).ThenInclude(e => e.Pais)
            .FirstAsync(x => x.IdCampeonato == idCampeonato);
        var organizacion = c.IdUsuarioCreador is int u
            ? await _db.Usuarios.Where(x => x.IdUsuario == u).Select(x => x.Nombre).FirstOrDefaultAsync() ?? ""
            : "";
        return new PublicoCampeonatoDto(
            c.Nombre, c.Anio, c.Estado.ToString(),
            c.FechaInicio.ToString("yyyy-MM-dd"), c.FechaFin.ToString("yyyy-MM-dd"),
            c.ModalidadDeportiva.Nombre, organizacion,
            c.Equipos.OrderBy(ce => ce.Equipo.Nombre)
                .Select(ce => new DirigenteEquipoDto(ce.IdEquipo, ce.Equipo.Nombre, ce.Equipo.Pais.Nombre, ce.Equipo.LogoUrl)).ToList());
    }

    // Jornadas con sus partidos: equipos, fecha, estadio y marcador. Sin planillas ni eventos.
    public async Task<List<PublicoJornadaDto>> JornadasAsync(int idCampeonato)
    {
        var jornadas = await _db.Jornadas
            .Where(j => j.IdCampeonato == idCampeonato)
            .OrderBy(j => j.Numero)
            .Select(j => new { j.IdJornada, j.Numero, Instancia = j.Instancia.Nombre, Grupo = j.Grupo != null ? j.Grupo.Nombre : null })
            .ToListAsync();
        var partidos = await _db.Partidos
            .Where(p => p.Jornada.IdCampeonato == idCampeonato)
            .OrderBy(p => p.Fecha)
            .Select(p => new DirigentePartidoDto(
                p.IdPartido, p.IdJornada, p.Jornada.Numero,
                p.IdEquipoLocal, p.EquipoLocal.Nombre, p.IdEquipoVisitante, p.EquipoVisitante.Nombre,
                p.EquipoLocal.LogoUrl, p.EquipoVisitante.LogoUrl,
                p.Fecha.ToString("yyyy-MM-dd HH:mm"),
                p.Estadio != null ? p.Estadio.Nombre : null,
                p.Jugado, p.Desierto, p.GolesLocal, p.GolesVisitante))
            .ToListAsync();
        return jornadas.Select(j => new PublicoJornadaDto(j.IdJornada, j.Numero, j.Instancia, j.Grupo,
            partidos.Where(p => p.IdJornada == j.IdJornada).ToList())).ToList();
    }
}
