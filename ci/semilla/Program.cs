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

// Quitar también las columnas de la Fase 8 (las crea su script real).
void QuitarColumna(string tabla, string columna)
{
    var cn = db.Database.GetDbConnection(); if (cn.State != System.Data.ConnectionState.Open) cn.Open();
    var nombres = new List<string>();
    using (var cmd = cn.CreateCommand())
    {
        cmd.CommandText = $"SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '{tabla}' AND COLUMN_NAME = '{columna}' AND REFERENCED_TABLE_NAME IS NOT NULL";
        using var r = cmd.ExecuteReader(); while (r.Read()) nombres.Add(r.GetString(0));
    }
    foreach (var fk in nombres) db.Database.ExecuteSqlRaw($"ALTER TABLE {tabla} DROP FOREIGN KEY `{fk}`");
    var indices = new List<string>();
    using (var cmd = cn.CreateCommand())
    {
        cmd.CommandText = $"SELECT DISTINCT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '{tabla}' AND COLUMN_NAME = '{columna}' AND INDEX_NAME <> 'PRIMARY'";
        using var r = cmd.ExecuteReader(); while (r.Read()) indices.Add(r.GetString(0));
    }
    if (columna == "id_cliente") db.Database.ExecuteSqlRaw($"ALTER TABLE {tabla} ADD INDEX ix_semilla_partido (id_partido)");
    foreach (var ix in indices) db.Database.ExecuteSqlRaw($"ALTER TABLE {tabla} DROP INDEX `{ix}`");
    db.Database.ExecuteSqlRaw($"ALTER TABLE {tabla} DROP COLUMN {columna}");
}

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
var fase8 = Environment.GetEnvironmentVariable("FASE8") == "1";
if (fase8)
{
    foreach (var (t, c) in new[] { ("partido", "id_usuario_cierre"), ("partido", "cerrado_en"), ("partido", "iniciado_en"), ("partido", "estado_registro"),
                                   ("eventopartido", "id_cliente"), ("eventopartido", "id_usuario_registro"),
                                   ("cambio_partido", "id_cliente"), ("cambio_partido", "id_usuario_registro"),
                                   ("alineacion_jugador", "id_usuario_registro") })
        QuitarColumna(t, c);
}
File.WriteAllText(Environment.GetEnvironmentVariable("SALIDA")!, System.Text.Json.JsonSerializer.Serialize(new {
    campA = a.camp.IdCampeonato, hoyA = a.hoyP.IdPartido, mananaA = a.mananaP.IdPartido,
    campB = b.camp.IdCampeonato, hoyB = b.hoyP.IdPartido, hoy = hoy.ToString("yyyy-MM-dd"), manana = hoy.AddDays(1).ToString("yyyy-MM-dd") }));
Console.WriteLine("semilla lista");
