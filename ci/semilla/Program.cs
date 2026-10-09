// Prueba temporal (no es parte del proyecto): crea la base con el modelo de EF Core,
// quita las tablas de la Fase 7 (las crea el script SQL real) y carga datos de ejemplo.
using Microsoft.EntityFrameworkCore;
using LigaManager.Domain.Entities;
using LigaManager.Infrastructure.Data;
using LigaManager.Infrastructure.Services;

var conn = Environment.GetEnvironmentVariable("CONN")!;
var db = new LigaManagerContext(new DbContextOptionsBuilder<LigaManagerContext>()
    .UseMySql(conn, new MySqlServerVersion(new Version(8, 0, 36))).Options);
db.Database.EnsureDeleted();
db.Database.EnsureCreated();
db.Database.ExecuteSqlRaw("DROP TABLE invitacion_vocal");
db.Database.ExecuteSqlRaw("DROP TABLE campeonato_vocal");
db.Database.ExecuteSqlRaw("ALTER TABLE usuario MODIFY COLUMN rol ENUM('ADMIN','ARBITRO','VEEDOR','DELEGADO','ORGANIZADOR') NOT NULL DEFAULT 'ADMIN'");

var hoy = HoraLocal.Hoy;
var pais = new Pais { Nombre = "Ecuador" }; db.Paises.Add(pais);
var tipo = new TipoPartido { Nombre = "Todos contra todos" }; db.TiposPartido.Add(tipo);
var mod = new ModalidadDeportiva { Nombre = "Fútbol 7", JugadoresPorLado = 7, DuracionTiempoMin = 25, NumTiempos = 2 }; db.ModalidadesDeportivas.Add(mod);
var inst = new CatalogoInstancia { Nombre = "Fase regular" }; db.CatalogoInstancias.Add(inst);
db.SaveChanges();

Usuario Org(string email) => new() { Email = email, Nombre = email.Split('@')[0], PasswordHash = BCrypt.Net.BCrypt.HashPassword("clave123"), Rol = RolUsuario.Organizador, Activo = true, CreatedAt = DateTime.UtcNow };
var org1 = Org("org1@prueba.ec"); var org2 = Org("org2@prueba.ec");
db.Usuarios.AddRange(org1, org2); db.SaveChanges();

int cedula = 1000;
(Campeonato camp, Partido hoyP, Partido mananaP) Crear(Usuario org, string nombre)
{
    var c = new Campeonato { Nombre = nombre, Anio = hoy.Year, FechaInicio = hoy.AddDays(-30), FechaFin = hoy.AddDays(60),
        Estado = EstadoCampeonato.EnCurso, IdModalidad = mod.IdModalidad, IdTipoPartido = tipo.IdTipoPartido, IdUsuarioCreador = org.IdUsuario };
    db.Campeonatos.Add(c);
    var equipos = new[] { new Equipo { Nombre = nombre + " Local", IdPais = pais.IdPais, IdUsuarioCreador = org.IdUsuario },
                          new Equipo { Nombre = nombre + " Visita", IdPais = pais.IdPais, IdUsuarioCreador = org.IdUsuario } };
    db.Equipos.AddRange(equipos); db.SaveChanges();
    foreach (var e in equipos)
    {
        db.CampeonatoEquipos.Add(new CampeonatoEquipo { IdCampeonato = c.IdCampeonato, IdEquipo = e.IdEquipo });
        for (var i = 1; i <= 8; i++)
        {
            var per = new Persona { Nombre = $"J{i}", Apellido = e.Nombre, Cedula = (cedula++).ToString(), FechaNac = new DateOnly(1990, 1, 1), IdPais = pais.IdPais,
                                    FotoUrl = i == 1 ? "/uploads/jugadores/x.jpg" : null };
            var jug = new Jugador { Persona = per };
            db.Jugadores.Add(jug);
            db.JugadorEquipos.Add(new JugadorEquipo { Jugador = jug, IdEquipo = e.IdEquipo, Dorsal = i, FechaDesde = hoy.AddDays(-100) });
        }
    }
    var j = new Jornada { Numero = 1, IdCampeonato = c.IdCampeonato, IdInstancia = inst.IdInstancia };
    db.Jornadas.Add(j); db.SaveChanges();
    var ph = new Partido { IdJornada = j.IdJornada, IdEquipoLocal = equipos[0].IdEquipo, IdEquipoVisitante = equipos[1].IdEquipo,
                           Fecha = hoy.ToDateTime(new TimeOnly(10, 0)), CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
    var pm = new Partido { IdJornada = j.IdJornada, IdEquipoLocal = equipos[1].IdEquipo, IdEquipoVisitante = equipos[0].IdEquipo,
                           Fecha = hoy.AddDays(1).ToDateTime(new TimeOnly(10, 0)), CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
    db.Partidos.AddRange(ph, pm); db.SaveChanges();
    return (c, ph, pm);
}
var a = Crear(org1, "Senior A");
var b = Crear(org2, "Barrial B");
File.WriteAllText(Environment.GetEnvironmentVariable("SALIDA")!, System.Text.Json.JsonSerializer.Serialize(new {
    campA = a.camp.IdCampeonato, hoyA = a.hoyP.IdPartido, mananaA = a.mananaP.IdPartido,
    campB = b.camp.IdCampeonato, hoyB = b.hoyP.IdPartido, hoy = hoy.ToString("yyyy-MM-dd"), manana = hoy.AddDays(1).ToString("yyyy-MM-dd") }));
Console.WriteLine("semilla lista");
