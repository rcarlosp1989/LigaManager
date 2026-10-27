namespace LigaManager.Infrastructure.Services;
using LigaManager.Application.Common;
using LigaManager.Application.DTOs.EnVivo;
using LigaManager.Domain.Entities;
using LigaManager.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

// Marcadores en vivo para el enlace público y el dirigente (solo lectura).
//
// - Partidos de hoy (hora de Ecuador) y cualquiera que siga en vivo.
// - Mientras se juega, el marcador sale de los goles registrados (el guardado se calcula al
//   cerrar); al terminar, el marcador guardado.
// - Goles con minuto y jugador (nombre corto) y rojas, incluida la de doble amarilla.
// - El reloj es el que envía el celular del vocal (fase y segundos).
// - Nada de fotos, documentos ni nóminas.
public class EnVivoService
{
    private readonly LigaManagerContext _db;
    private readonly AccesoCampeonato   _acceso;
    public EnVivoService(LigaManagerContext db, AccesoCampeonato acceso) { _db = db; _acceso = acceso; }

    private static readonly Dictionary<FaseReloj, string> Fases = new()
    {
        [FaseReloj.Antes] = "antes", [FaseReloj.PrimerTiempo] = "1T", [FaseReloj.Descanso] = "descanso",
        [FaseReloj.SegundoTiempo] = "2T", [FaseReloj.Final] = "final",
    };

    public async Task<EnVivoDto?> ConsultarAsync(int idCampeonato)
    {
        if (!await _acceso.LecturaCampeonatoAsync(idCampeonato)) return null;
        var hoy = HoraLocal.Hoy;
        var desde = hoy.ToDateTime(TimeOnly.MinValue);
        var hasta = desde.AddDays(1);

        var partidos = await _db.Partidos
            .Where(p => p.Jornada.IdCampeonato == idCampeonato
                && ((p.Fecha >= desde && p.Fecha < hasta)
                    || (p.EstadoRegistro == EstadoRegistro.EnVivo && !p.Jugado)))
            .OrderBy(p => p.Fecha)
            .Select(p => new
            {
                p.IdPartido, p.IdEquipoLocal, Local = p.EquipoLocal.Nombre, LogoLocal = p.EquipoLocal.LogoUrl,
                p.IdEquipoVisitante, Visitante = p.EquipoVisitante.Nombre, LogoVisitante = p.EquipoVisitante.LogoUrl,
                p.Fecha, Estadio = p.Estadio != null ? p.Estadio.Nombre : null,
                p.Jugado, p.Desierto, p.EstadoRegistro, p.GolesLocal, p.GolesVisitante,
                p.RelojFase, p.RelojSegundos, p.RelojDesde, p.RelojDuracionMin,
                DuracionModalidad = p.Jornada.Campeonato.ModalidadDeportiva.DuracionTiempoMin,
            })
            .ToListAsync();
        if (partidos.Count == 0) return new EnVivoDto(hoy.ToString("yyyy-MM-dd"), []);

        var ids = partidos.Select(p => p.IdPartido).ToList();
        var eventos = await _db.EventosPartido
            .Where(e => ids.Contains(e.IdPartido)
                && (e.TipoEvento == "GOL" || e.TipoEvento == "GOL_EN_CONTRA" || e.TipoEvento == "TARJETA_ROJA" || e.TipoEvento == "TARJETA_AMARILLA"))
            .OrderBy(e => e.Minuto).ThenBy(e => e.IdEvento)
            .Select(e => new { e.IdPartido, e.IdJugador, e.TipoEvento, e.Minuto, e.Jugador.Persona.Nombre, e.Jugador.Persona.Apellido })
            .ToListAsync();

        // Equipo de cada jugador a la fecha de cada partido (como al calcular el marcador guardado).
        var equipos = partidos.SelectMany(p => new[] { p.IdEquipoLocal, p.IdEquipoVisitante }).Distinct().ToList();
        var jugadoresEv = eventos.Select(e => e.IdJugador).Distinct().ToList();
        var vinculos = await _db.JugadorEquipos
            .Where(je => equipos.Contains(je.IdEquipo) && jugadoresEv.Contains(je.IdJugador))
            .Select(je => new { je.IdJugador, je.IdEquipo, je.FechaDesde, je.FechaHasta })
            .ToListAsync();

        var ahora = DateTime.UtcNow;
        var lista = new List<PartidoEnVivoDto>();
        foreach (var p in partidos)
        {
            var fecha = DateOnly.FromDateTime(p.Fecha);
            bool De(int idJugador, int idEquipo) => vinculos.Any(v => v.IdJugador == idJugador && v.IdEquipo == idEquipo
                && v.FechaDesde <= fecha && (v.FechaHasta == null || v.FechaHasta >= fecha));
            string? LadoDe(int idJugador) => De(idJugador, p.IdEquipoLocal) ? "local" : De(idJugador, p.IdEquipoVisitante) ? "visitante" : null;
            static string Otro(string lado) => lado == "local" ? "visitante" : "local";

            var final   = p.Jugado || p.EstadoRegistro == EstadoRegistro.Cerrado;
            var enVivo  = !final && p.EstadoRegistro == EstadoRegistro.EnVivo;
            var estado  = final ? "Final" : enVivo ? "EnVivo" : "PorJugar";

            var lineas = new List<EventoEnVivoDto>();
            var amarillas = new Dictionary<int, int>();
            int golesL = 0, golesV = 0;
            foreach (var e in eventos.Where(e => e.IdPartido == p.IdPartido))
            {
                var lado = LadoDe(e.IdJugador);
                if (lado is null) continue;
                var nombre = NombreCorto.De(e.Nombre, e.Apellido);
                switch (e.TipoEvento)
                {
                    case "GOL":
                        if (lado == "local") golesL++; else golesV++;
                        lineas.Add(new EventoEnVivoDto(e.Minuto, "GOL", nombre, lado, false));
                        break;
                    case "GOL_EN_CONTRA":
                        var suma = Otro(lado);
                        if (suma == "local") golesL++; else golesV++;
                        lineas.Add(new EventoEnVivoDto(e.Minuto, "GOL_EN_CONTRA", nombre, suma, false));
                        break;
                    case "TARJETA_AMARILLA":
                        amarillas[e.IdJugador] = amarillas.GetValueOrDefault(e.IdJugador) + 1;
                        // La segunda amarilla es roja (si no registraron también la roja aparte).
                        if (amarillas[e.IdJugador] == 2
                            && !eventos.Any(x => x.IdPartido == p.IdPartido && x.IdJugador == e.IdJugador && x.TipoEvento == "TARJETA_ROJA"))
                            lineas.Add(new EventoEnVivoDto(e.Minuto, "ROJA", nombre, lado, true));
                        break;
                    case "TARJETA_ROJA":
                        lineas.Add(new EventoEnVivoDto(e.Minuto, "ROJA", nombre, lado,
                            eventos.Count(x => x.IdPartido == p.IdPartido && x.IdJugador == e.IdJugador && x.TipoEvento == "TARJETA_AMARILLA") >= 2));
                        break;
                }
            }

            int? gl = null, gv = null;
            if (final) { gl = p.GolesLocal ?? golesL; gv = p.GolesVisitante ?? golesV; }
            else if (enVivo) { gl = golesL; gv = golesV; }
            if (p.Desierto) lineas.Clear();

            RelojEnVivoDto? reloj = null;
            if (!p.Desierto && (enVivo || final) && p.RelojFase != FaseReloj.Antes)
            {
                var corriendo = enVivo && p.RelojDesde is not null;
                var segundos = corriendo ? (int)Math.Max(0, (ahora - p.RelojDesde!.Value).TotalSeconds) : p.RelojSegundos;
                var fase = final ? "final" : Fases[p.RelojFase];
                reloj = new RelojEnVivoDto(fase, segundos, corriendo, p.RelojDuracionMin ?? (p.DuracionModalidad > 0 ? p.DuracionModalidad : 45));
            }

            lista.Add(new PartidoEnVivoDto(
                p.IdPartido, p.IdEquipoLocal, p.Local, p.LogoLocal, p.IdEquipoVisitante, p.Visitante, p.LogoVisitante,
                p.Fecha.ToString("yyyy-MM-dd HH:mm"), p.Estadio, estado, p.Desierto, gl, gv, reloj,
                final || enVivo ? lineas : []));
        }
        return new EnVivoDto(hoy.ToString("yyyy-MM-dd"), lista);
    }
}
