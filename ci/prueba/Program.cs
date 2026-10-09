// Prueba temporal de la Fase 6: ejecuta las consultas cambiadas contra un MySQL vacío
// para comprobar que EF Core las traduce a SQL. No es parte del proyecto.
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using LigaManager.Infrastructure.Data;
using LigaManager.Infrastructure.Services;

var conn = "Server=127.0.0.1;Port=3306;Database=liga_prueba;User=root;Password=root;";
var opciones = new DbContextOptionsBuilder<LigaManagerContext>()
    .UseMySql(conn, new MySqlServerVersion(new Version(8, 0, 36)))
    .LogTo(s => { if (s.Contains("SELECT")) Console.WriteLine(s); }, Microsoft.Extensions.Logging.LogLevel.Information)
    .Options;
using var db = new LigaManagerContext(opciones);
db.Database.EnsureDeleted();
db.Database.EnsureCreated();

var http = new HttpContextAccessor { HttpContext = new DefaultHttpContext {
    User = new ClaimsPrincipal(new ClaimsIdentity(new[] {
        new Claim(ClaimTypes.NameIdentifier, "1"), new Claim(ClaimTypes.Role, "Admin") }, "prueba")) } };

var camp = await new CampeonatoService(db, http).GetAllAsync();
Console.WriteLine($"OK campeonatos: {camp.Count}");
var dash = await new DashboardService(db).GetDashboardAsync();
Console.WriteLine($"OK dashboard: {dash.ProximosPartidos.Count}/{dash.UltimosResultados.Count}");
var jornadas = new JornadaService(db, http, new AccesoCampeonato(db, http));
var partido = await jornadas.GetPartidoAsync(1);
Console.WriteLine($"OK partido: {partido.Success} {partido.Error}");
var jornada = await jornadas.GetByIdAsync(1);
Console.WriteLine($"OK jornada: {jornada.Success} {jornada.Error}");
var equipo = await new EquipoService(db, http).GetByIdAsync(1, DateOnly.FromDateTime(DateTime.Today));
Console.WriteLine($"OK equipo: {equipo.Success} {equipo.Error}");
Console.WriteLine("TODO OK");
