namespace LigaManager.Infrastructure.Services;
using LigaManager.Application.DTOs.Jugadores;
using LigaManager.Application.Common;
using LigaManager.Application.Interfaces;
using LigaManager.Domain.Entities;
using LigaManager.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;

public class JugadorService : IJugadorService
{
    private readonly LigaManagerContext _db;
    private readonly IHttpContextAccessor _http;
    private readonly Ubicaciones _ubicaciones;
    private readonly IAlmacenImagenes _imagenes;
    public JugadorService(LigaManagerContext db, IHttpContextAccessor http, Ubicaciones ubicaciones, IAlmacenImagenes imagenes) { _db = db; _http = http; _ubicaciones = ubicaciones; _imagenes = imagenes; }

    private int? UsuarioActualId => int.TryParse(
        _http.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    private static int CalcularEdad(DateOnly fechaNacimiento)
    {
        var hoy = DateOnly.FromDateTime(DateTime.Today);
        var edad = hoy.Year - fechaNacimiento.Year;
        if (fechaNacimiento > hoy.AddYears(-edad)) edad--;
        return edad;
    }

    public async Task<List<JugadorListDto>> GetAllAsync(int? equipoId)
    {
        var query = _db.Jugadores
            .Include(j => j.JugadorEquipos).ThenInclude(je => je.Equipo)
            .Where(j => j.JugadorEquipos.Any(je => je.Equipo.IdUsuarioCreador == UsuarioActualId))
            .AsQueryable();

        if (equipoId.HasValue)
            query = query.Where(j => j.JugadorEquipos
                .Any(je => je.IdEquipo == equipoId
                        && je.Equipo.IdUsuarioCreador == UsuarioActualId
                        && je.FechaHasta == null));

        var registros = await query
            .OrderBy(j => j.Persona.Apellido)
            .Select(j => new {
                j.IdJugador,
                j.Persona.Nombre,
                j.Persona.Apellido,
                j.Persona.Cedula,
                j.Persona.TipoIdentificacion,
                j.Persona.FechaNac,
                Canton = j.Persona.Canton != null ? j.Persona.Canton.Nombre : null,
                Provincia = j.Persona.Canton != null ? j.Persona.Canton.Provincia.Nombre : null,
                Pais = j.Persona.Pais.Nombre,
                EquipoActual = j.JugadorEquipos
                    .Where(je => je.FechaHasta == null)
                    .Select(je => je.Equipo.Nombre)
                    .FirstOrDefault(),
                Dorsal = j.JugadorEquipos
                    .Where(je => je.FechaHasta == null)
                    .Select(je => je.Dorsal)
                    .FirstOrDefault(),
                Posicion = j.JugadorEquipos.Where(je => je.FechaHasta == null).Select(je => je.Posicion).FirstOrDefault(),
                j.Persona.FotoUrl
            })
            .ToListAsync();

        return registros.Select(j => new JugadorListDto(
            j.IdJugador, j.Nombre, j.Apellido, j.Cedula,
            j.FechaNac.ToString("yyyy-MM-dd"), CalcularEdad(j.FechaNac),
            j.Canton != null ? $"{j.Canton}, {j.Provincia}" : j.Pais,
            j.EquipoActual, j.Dorsal, j.Posicion, j.FotoUrl, j.TipoIdentificacion.ToString())).ToList();
    }

    public async Task<ServiceResult<JugadorDetalleDto>> GetByIdAsync(int id)
    {
        var j = await _db.Jugadores
            .Include(j => j.Persona).ThenInclude(p => p.Pais)
            .Include(j => j.Persona).ThenInclude(p => p.Canton).ThenInclude(c => c!.Provincia)
            .Include(j => j.JugadorEquipos).ThenInclude(je => je.Equipo)
            .FirstOrDefaultAsync(j => j.IdJugador == id
                                   && j.JugadorEquipos.Any(je => je.Equipo.IdUsuarioCreador == UsuarioActualId));

        if (j is null) return ServiceResult<JugadorDetalleDto>.Fail("Jugador no encontrado.");

        return ServiceResult<JugadorDetalleDto>.Ok(new JugadorDetalleDto(
            j.IdJugador, j.IdPersona,
            j.Persona.Nombre, j.Persona.Apellido,
            j.Persona.Cedula,
            j.Persona.FechaNac.ToString("yyyy-MM-dd"),
            CalcularEdad(j.Persona.FechaNac),
            j.Persona.IdPais,
            j.Persona.Pais.Nombre,
            j.Persona.Canton?.IdProvincia,
            j.Persona.Canton?.Provincia.Nombre,
            j.Persona.IdCanton,
            j.Persona.Canton?.Nombre,
            j.Persona.FotoUrl,
            j.JugadorEquipos
                .Where(je => je.Equipo.IdUsuarioCreador == UsuarioActualId)
                .OrderByDescending(je => je.FechaDesde)
                .Select(je => new HistorialEquipoDto(
                    je.IdEquipo,
                    je.Equipo.Nombre,
                    je.FechaDesde.ToString("yyyy-MM-dd"),
                    je.FechaHasta?.ToString("yyyy-MM-dd"),
                    je.Dorsal,
                    je.Posicion
                )).ToList(),
            j.Persona.TipoIdentificacion.ToString()
        ));
    }

    public async Task<ServiceResult<JugadorDetalleDto>> CreateAsync(CreateJugadorRequest req)
    {
        if (!DateOnly.TryParse(req.FechaNac,   out var fechaNac) ||
            !DateOnly.TryParse(req.FechaDesde, out var fechaDesde))
            return ServiceResult<JugadorDetalleDto>.Fail("Formato de fecha inválido. Use yyyy-MM-dd.");

        var ubicacion = await _ubicaciones.ValidarAsync(req.IdPais, req.IdCanton);
        if (ubicacion.Error is not null) return ServiceResult<JugadorDetalleDto>.Fail(ubicacion.Error);

        var doc = Identificacion.Validar(req.TipoIdentificacion, req.Cedula);
        if (doc.Error is not null) return ServiceResult<JugadorDetalleDto>.Fail(doc.Error);

        // El documento se repite solo dentro de la misma liga: el mismo jugador puede estar
        // registrado por otro organizador con su propia ficha, sin que se vean entre ellas.
        if (await CedulaDeJugadorPropioAsync(doc.Tipo, doc.Numero, null))
            return ServiceResult<JugadorDetalleDto>.Fail("Ya tienes un jugador registrado con ese documento.");

        var equipoExiste = await _db.Equipos
            .AnyAsync(e => e.IdEquipo == req.IdEquipo && e.IdUsuarioCreador == UsuarioActualId);
        if (!equipoExiste) return ServiceResult<JugadorDetalleDto>.Fail("El equipo no pertenece a tu organización.");

        var persona = new Persona
        {
            Nombre   = req.Nombre.Trim(),
            Apellido = req.Apellido.Trim(),
            Cedula   = doc.Numero,
            TipoIdentificacion = Enum.Parse<TipoIdentificacion>(doc.Tipo),
            FechaNac = fechaNac,
            IdPais   = req.IdPais,
            IdCanton = ubicacion.IdCanton,
            FotoUrl  = req.FotoUrl
        };
        _db.Personas.Add(persona);
        await _db.SaveChangesAsync();

        var jugador = new Jugador { IdPersona = persona.IdPersona };
        _db.Jugadores.Add(jugador);
        await _db.SaveChangesAsync();

        var vinculo = new JugadorEquipo
        {
            IdJugador  = jugador.IdJugador,
            IdEquipo   = req.IdEquipo,
            FechaDesde = fechaDesde,
            Dorsal     = req.Dorsal,
            Posicion   = req.Posicion?.Trim(),
            FechaHasta = null
        };
        _db.JugadorEquipos.Add(vinculo);
        await _db.SaveChangesAsync();

        return await GetByIdAsync(jugador.IdJugador);
    }

    public async Task<ServiceResult<JugadorDetalleDto>> UpdateAsync(int id, UpdateJugadorRequest req)
    {
        var jugador = await _db.Jugadores
            .Include(j => j.Persona)
            .Include(j => j.JugadorEquipos).ThenInclude(je => je.Equipo)
            .FirstOrDefaultAsync(j => j.IdJugador == id
                                   && j.JugadorEquipos.Any(je => je.Equipo.IdUsuarioCreador == UsuarioActualId));

        if (jugador is null) return ServiceResult<JugadorDetalleDto>.Fail("Jugador no encontrado.");

        if (!DateOnly.TryParse(req.FechaNac, out var fechaNac))
            return ServiceResult<JugadorDetalleDto>.Fail("Formato de fecha inválido.");

        var doc = Identificacion.Validar(req.TipoIdentificacion, req.Cedula);
        if (doc.Error is not null) return ServiceResult<JugadorDetalleDto>.Fail(doc.Error);

        if (await CedulaDeJugadorPropioAsync(doc.Tipo, doc.Numero, jugador.IdPersona))
            return ServiceResult<JugadorDetalleDto>.Fail("Ya tienes otro jugador registrado con ese documento.");

        var ubicacion = await _ubicaciones.ValidarAsync(req.IdPais, req.IdCanton);
        if (ubicacion.Error is not null) return ServiceResult<JugadorDetalleDto>.Fail(ubicacion.Error);

        jugador.Persona.Nombre   = req.Nombre.Trim();
        jugador.Persona.Apellido = req.Apellido.Trim();
        jugador.Persona.Cedula   = doc.Numero;
        jugador.Persona.TipoIdentificacion = Enum.Parse<TipoIdentificacion>(doc.Tipo);
        jugador.Persona.FechaNac = fechaNac;
        jugador.Persona.IdPais   = req.IdPais;
        jugador.Persona.IdCanton = ubicacion.IdCanton;
        // Foto nueva: la anterior se borra después de guardar.
        var fotoAnterior = req.FotoUrl is not null ? jugador.Persona.FotoUrl : null;
        if (req.FotoUrl is not null) jugador.Persona.FotoUrl = req.FotoUrl;

        var vinculoActual = await _db.JugadorEquipos
            .FirstOrDefaultAsync(je => je.IdJugador == id && je.FechaHasta == null);
        if (vinculoActual is not null && req.Posicion is not null)
            vinculoActual.Posicion = req.Posicion.Trim();
        if (vinculoActual is not null)
            vinculoActual.Dorsal = req.Dorsal;

        await _db.SaveChangesAsync();
        if (fotoAnterior != jugador.Persona.FotoUrl) await _imagenes.BorrarAsync(fotoAnterior);
        return await GetByIdAsync(id);
    }

    public async Task<ServiceResult> UpdateDorsalAsync(int idJugador, UpdateDorsalRequest req)
    {
        var vinculo = await _db.JugadorEquipos
            .FirstOrDefaultAsync(je => je.IdJugador == idJugador
                                    && je.FechaHasta == null
                                    && je.Equipo.IdUsuarioCreador == UsuarioActualId);

        if (vinculo is null)
            return ServiceResult.Fail("El jugador no tiene un vínculo activo.");

        vinculo.Dorsal = req.Dorsal;
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    public async Task<ServiceResult> DeleteAsync(int id)
    {
        var jugador = await _db.Jugadores
            .Include(j => j.JugadorEquipos).ThenInclude(je => je.Equipo)
            .FirstOrDefaultAsync(j => j.IdJugador == id
                                   && j.JugadorEquipos.Any(je => je.Equipo.IdUsuarioCreador == UsuarioActualId));
        if (jugador is null) return ServiceResult.Fail("Jugador no encontrado.");

        var tieneEventos = await _db.EventosPartido.AnyAsync(e => e.IdJugador == id);
        if (tieneEventos)
            return ServiceResult.Fail("No se puede eliminar: el jugador tiene eventos registrados en partidos.");

        var foto = await _db.Personas.Where(p => p.IdPersona == jugador.IdPersona).Select(p => p.FotoUrl).FirstOrDefaultAsync();
        _db.Jugadores.Remove(jugador);
        await _db.SaveChangesAsync();
        await _imagenes.BorrarAsync(foto);
        return ServiceResult.Ok();
    }

    // ¿Este organizador ya tiene un jugador con ese documento? (los de otras ligas no cuentan)
    private Task<bool> CedulaDeJugadorPropioAsync(string tipo, string cedula, int? excepto)
    {
        var t = Enum.Parse<TipoIdentificacion>(tipo);
        return _db.Jugadores.AnyAsync(j => j.Persona.Cedula == cedula && j.Persona.TipoIdentificacion == t
                                    && (excepto == null || j.IdPersona != excepto)
                                    && j.JugadorEquipos.Any(je => je.Equipo.IdUsuarioCreador == UsuarioActualId));
    }

    public async Task<ServiceResult> VincularEquipoAsync(int idJugador, VincularEquipoRequest req)
    {
        var jugador = await _db.Jugadores
            .Include(j => j.JugadorEquipos).ThenInclude(je => je.Equipo)
            .FirstOrDefaultAsync(j => j.IdJugador == idJugador
                                   && j.JugadorEquipos.Any(je => je.Equipo.IdUsuarioCreador == UsuarioActualId));
        if (jugador is null) return ServiceResult.Fail("Jugador no encontrado.");

        var equipoPropio = await _db.Equipos
            .AnyAsync(e => e.IdEquipo == req.IdEquipo && e.IdUsuarioCreador == UsuarioActualId);
        if (!equipoPropio) return ServiceResult.Fail("El equipo no pertenece a tu organización.");

        if (!DateOnly.TryParse(req.FechaDesde, out var fechaDesde))
            return ServiceResult.Fail("Formato de fecha inválido.");

        var vinculoActivo = await _db.JugadorEquipos
            .AnyAsync(je => je.IdJugador == idJugador && je.FechaHasta == null);
        if (vinculoActivo)
            return ServiceResult.Fail("El jugador tiene un vínculo activo. Ciérrelo antes de crear uno nuevo.");

        _db.JugadorEquipos.Add(new JugadorEquipo
        {
            IdJugador  = idJugador,
            IdEquipo   = req.IdEquipo,
            FechaDesde = fechaDesde,
            Dorsal     = req.Dorsal,
            Posicion   = req.Posicion?.Trim(),
            FechaHasta = req.FechaHasta is not null && DateOnly.TryParse(req.FechaHasta, out var fh)
                         ? fh : null
        });
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    public async Task<ServiceResult> CerrarVinculoAsync(int idJugador, int idJugadorEquipo, string fechaHasta)
    {
        var vinculo = await _db.JugadorEquipos
            .Include(je => je.Equipo)
            .FirstOrDefaultAsync(je => je.IdJugadorEquipo == idJugadorEquipo
                                    && je.IdJugador       == idJugador
                                    && je.Equipo.IdUsuarioCreador == UsuarioActualId);

        if (vinculo is null) return ServiceResult.Fail("Vínculo no encontrado.");
        if (vinculo.FechaHasta is not null) return ServiceResult.Fail("El vínculo ya está cerrado.");

        if (!DateOnly.TryParse(fechaHasta, out var fh))
            return ServiceResult.Fail("Formato de fecha inválido.");

        if (fh <= vinculo.FechaDesde)
            return ServiceResult.Fail("La fecha de cierre debe ser posterior a la fecha de inicio del vínculo.");

        vinculo.FechaHasta = fh;
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }
}
