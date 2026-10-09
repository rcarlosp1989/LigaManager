namespace LigaManager.Infrastructure.Data;
using LigaManager.Domain.Entities;
using Microsoft.EntityFrameworkCore;

public class LigaManagerContext : DbContext
{
    public LigaManagerContext(DbContextOptions<LigaManagerContext> options)
        : base(options) { }

    public DbSet<Usuario>            Usuarios              { get; set; }
    public DbSet<Pais>               Paises                { get; set; }
    public DbSet<Provincia>          Provincias            { get; set; }
    public DbSet<Canton>             Cantones              { get; set; }
    public DbSet<Persona>            Personas              { get; set; }
    public DbSet<Equipo>             Equipos               { get; set; }
    public DbSet<Jugador>            Jugadores             { get; set; }
    public DbSet<JugadorEquipo>      JugadorEquipos        { get; set; }
    public DbSet<Arbitro>            Arbitros              { get; set; }
    public DbSet<Estadio>            Estadios              { get; set; }
    public DbSet<TipoPartido>        TiposPartido          { get; set; }
    public DbSet<ModalidadDeportiva> ModalidadesDeportivas { get; set; }
    public DbSet<Campeonato>         Campeonatos           { get; set; }
    public DbSet<CampeonatoEquipo>   CampeonatoEquipos     { get; set; }
    public DbSet<Grupo>              Grupos                { get; set; }
    public DbSet<GrupoEquipo>        GrupoEquipos          { get; set; }
    public DbSet<FaseCampeonato>     FasesCampeonato       { get; set; }
    public DbSet<PosicionGrupo>      PosicionesGrupo       { get; set; }
    public DbSet<CatalogoInstancia>  CatalogoInstancias    { get; set; }
    public DbSet<Jornada>            Jornadas              { get; set; }
    public DbSet<Partido>            Partidos              { get; set; }
    public DbSet<EventoPartido>      EventosPartido        { get; set; }
    public DbSet<AlineacionJugador>  Alineaciones          { get; set; }
    public DbSet<CambioPartido>      CambiosPartido        { get; set; }
    public DbSet<CargoOficial>       CargosOficiales       { get; set; }
    public DbSet<ModalidadCargo>     ModalidadCargos       { get; set; }
    public DbSet<PartidoOficial>     PartidosOficiales     { get; set; }
    public DbSet<Abono>              Abonos                { get; set; }
    public DbSet<ConceptoPago>       ConceptosPago         { get; set; }
    public DbSet<Pago>               Pagos                 { get; set; }
    public DbSet<SancionManual>      SancionesManuales     { get; set; }
    public DbSet<CampeonatoVocal>    CampeonatoVocales     { get; set; }
    public DbSet<InvitacionVocal>    InvitacionesVocal     { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ── Nombres de tablas ────────────────────────────────────────────────
        modelBuilder.Entity<Usuario>()           .ToTable("usuario");
        modelBuilder.Entity<Pais>()              .ToTable("pais");
        modelBuilder.Entity<Provincia>()         .ToTable("provincia");
        modelBuilder.Entity<Canton>()            .ToTable("canton");
        modelBuilder.Entity<Persona>()           .ToTable("persona");
        modelBuilder.Entity<Equipo>()            .ToTable("equipo");
        modelBuilder.Entity<Jugador>()           .ToTable("jugador");
        modelBuilder.Entity<JugadorEquipo>()     .ToTable("jugador_equipo");
        modelBuilder.Entity<Arbitro>()           .ToTable("arbitro");
        modelBuilder.Entity<Estadio>()           .ToTable("estadio");
        modelBuilder.Entity<TipoPartido>()       .ToTable("tipopartido");
        modelBuilder.Entity<ModalidadDeportiva>().ToTable("modalidaddeportiva");
        modelBuilder.Entity<Campeonato>()        .ToTable("campeonato");
        modelBuilder.Entity<CampeonatoEquipo>()  .ToTable("campeonato_equipo");
        modelBuilder.Entity<Grupo>()             .ToTable("grupo");
        modelBuilder.Entity<GrupoEquipo>()       .ToTable("grupo_equipo");
        modelBuilder.Entity<FaseCampeonato>()    .ToTable("fase_campeonato");
        modelBuilder.Entity<PosicionGrupo>()     .ToTable("posicion_grupo");
        modelBuilder.Entity<CatalogoInstancia>() .ToTable("catalogoinstancia");
        modelBuilder.Entity<Jornada>()           .ToTable("jornada");
        modelBuilder.Entity<Partido>()           .ToTable("partido");
        modelBuilder.Entity<EventoPartido>()     .ToTable("eventopartido");
        modelBuilder.Entity<AlineacionJugador>() .ToTable("alineacion_jugador");
        modelBuilder.Entity<CambioPartido>()     .ToTable("cambio_partido");
        modelBuilder.Entity<CargoOficial>()      .ToTable("cargo_oficial");
        modelBuilder.Entity<ModalidadCargo>()    .ToTable("modalidad_cargo");
        modelBuilder.Entity<PartidoOficial>()    .ToTable("partido_oficial");
        modelBuilder.Entity<Abono>()             .ToTable("abono");
        modelBuilder.Entity<ConceptoPago>()      .ToTable("conceptopago");
        modelBuilder.Entity<Pago>()              .ToTable("pago");
        modelBuilder.Entity<SancionManual>()     .ToTable("sancion_manual");
        modelBuilder.Entity<CampeonatoVocal>()   .ToTable("campeonato_vocal");
        modelBuilder.Entity<InvitacionVocal>()   .ToTable("invitacion_vocal");

        // ── Enums como string ────────────────────────────────────────────────
        modelBuilder.Entity<Usuario>()
            .Property(u => u.Rol)
            .HasConversion<string>();

        modelBuilder.Entity<Campeonato>()
            .Property(c => c.Estado)
            .HasConversion<string>();

        // ── Claves primarias explícitas ──────────────────────────────────────
        modelBuilder.Entity<Usuario>()           .HasKey(u  => u.IdUsuario);
        modelBuilder.Entity<Pais>()              .HasKey(p  => p.IdPais);
        modelBuilder.Entity<Provincia>()         .HasKey(p  => p.IdProvincia);
        modelBuilder.Entity<Canton>()            .HasKey(c  => c.IdCanton);
        modelBuilder.Entity<Persona>()           .HasKey(p  => p.IdPersona);
        modelBuilder.Entity<Equipo>()            .HasKey(e  => e.IdEquipo);
        modelBuilder.Entity<Jugador>()           .HasKey(j  => j.IdJugador);
        modelBuilder.Entity<JugadorEquipo>()     .HasKey(je => je.IdJugadorEquipo);
        modelBuilder.Entity<Arbitro>()           .HasKey(a  => a.IdArbitro);
        modelBuilder.Entity<Estadio>()           .HasKey(e  => e.IdEstadio);
        modelBuilder.Entity<TipoPartido>()       .HasKey(t  => t.IdTipoPartido);
        modelBuilder.Entity<ModalidadDeportiva>().HasKey(m  => m.IdModalidad);
        modelBuilder.Entity<Campeonato>()        .HasKey(c  => c.IdCampeonato);
        modelBuilder.Entity<Grupo>()             .HasKey(g  => g.IdGrupo);
        modelBuilder.Entity<FaseCampeonato>()    .HasKey(f  => f.IdFase);
        modelBuilder.Entity<PosicionGrupo>()     .HasKey(p  => p.IdPosicion);
        modelBuilder.Entity<GrupoEquipo>()       .HasKey(ge => new { ge.IdGrupo, ge.IdEquipo });
        modelBuilder.Entity<CatalogoInstancia>() .HasKey(c  => c.IdInstancia);
        modelBuilder.Entity<Jornada>()           .HasKey(j  => j.IdJornada);
        modelBuilder.Entity<Partido>()           .HasKey(p  => p.IdPartido);
        modelBuilder.Entity<EventoPartido>()     .HasKey(e  => e.IdEvento);
        modelBuilder.Entity<AlineacionJugador>() .HasKey(a  => a.IdAlineacion);
        modelBuilder.Entity<CambioPartido>()     .HasKey(c  => c.IdCambio);
        modelBuilder.Entity<CargoOficial>()      .HasKey(c  => c.IdCargo);
        modelBuilder.Entity<ModalidadCargo>()    .HasKey(mc => new { mc.IdModalidad, mc.IdCargo });
        modelBuilder.Entity<PartidoOficial>()    .HasKey(po => new { po.IdPartido, po.IdCargo });
        modelBuilder.Entity<Abono>()             .HasKey(a  => a.IdAbono);
        modelBuilder.Entity<ConceptoPago>()      .HasKey(c  => c.IdConcepto);
        modelBuilder.Entity<Pago>()              .HasKey(p  => p.IdPago);
        modelBuilder.Entity<SancionManual>()     .HasKey(s  => s.IdSancion);

        modelBuilder.Entity<CampeonatoEquipo>()
            .HasKey(ce => new { ce.IdCampeonato, ce.IdEquipo });

        // ── Relaciones uno a uno ─────────────────────────────────────────────
        modelBuilder.Entity<Jugador>()
            .HasOne(j => j.Persona)
            .WithOne(p => p.Jugador)
            .HasForeignKey<Jugador>(j => j.IdPersona);

        modelBuilder.Entity<Arbitro>()
            .HasOne(a => a.Persona)
            .WithOne(p => p.Arbitro)
            .HasForeignKey<Arbitro>(a => a.IdPersona);

        modelBuilder.Entity<Arbitro>(e =>
        {
            e.Property(a => a.IdUsuarioCreador).HasColumnName("id_usuario_creador");
            e.HasOne(a => a.UsuarioCreador).WithMany().HasForeignKey(a => a.IdUsuarioCreador).OnDelete(DeleteBehavior.SetNull);
        });

        // ── Relaciones Provincia / Canton ────────────────────────────────────
        modelBuilder.Entity<Provincia>(e =>
        {
            e.Property(p => p.IdProvincia).HasColumnName("id_provincia");
            e.Property(p => p.Nombre)     .HasColumnName("nombre");
            e.Property(p => p.IdPais)     .HasColumnName("id_pais");

            e.HasOne(p => p.Pais)
                .WithMany(pa => pa.Provincias)
                .HasForeignKey(p => p.IdPais);
        });

        modelBuilder.Entity<Canton>(e =>
        {
            e.Property(c => c.IdCanton)   .HasColumnName("id_canton");
            e.Property(c => c.Nombre)     .HasColumnName("nombre");
            e.Property(c => c.IdProvincia).HasColumnName("id_provincia");

            e.HasOne(c => c.Provincia)
                .WithMany(p => p.Cantones)
                .HasForeignKey(c => c.IdProvincia);
        });

        // ── Relaciones Equipo ────────────────────────────────────────────────
        modelBuilder.Entity<Equipo>(e =>
        {
            e.Property(eq => eq.IdEquipo).HasColumnName("id_equipo");
            e.Property(eq => eq.Nombre)  .HasColumnName("nombre");
            e.Property(eq => eq.IdPais)  .HasColumnName("id_pais");
            e.Property(eq => eq.IdUsuarioCreador).HasColumnName("id_usuario_creador");

            e.HasOne(eq => eq.UsuarioCreador)
                .WithMany()
                .HasForeignKey(eq => eq.IdUsuarioCreador)
                .OnDelete(DeleteBehavior.SetNull);

            e.HasOne(eq => eq.Pais)
                .WithMany(p => p.Equipos)
                .HasForeignKey(eq => eq.IdPais);
        });

        // ── Relaciones Persona ───────────────────────────────────────────────
        modelBuilder.Entity<Persona>(e =>
        {
            e.Property(p => p.IdPersona).HasColumnName("id_persona");
            e.Property(p => p.Nombre)   .HasColumnName("nombre");
            e.Property(p => p.Apellido) .HasColumnName("apellido");
            e.Property(p => p.Cedula)   .HasColumnName("cedula");
            e.Property(p => p.FechaNac) .HasColumnName("fecha_nac");
            e.Property(p => p.IdPais)   .HasColumnName("id_pais");
            e.Property(p => p.IdCanton) .HasColumnName("id_canton");
            e.Property(p => p.FotoUrl)  .HasColumnName("foto_url");

            e.HasOne(p => p.Pais)
                .WithMany()
                .HasForeignKey(p => p.IdPais)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(p => p.Canton)
                .WithMany()
                .HasForeignKey(p => p.IdCanton)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // ── Relaciones JugadorEquipo ─────────────────────────────────────────
        modelBuilder.Entity<JugadorEquipo>(e =>
        {
            e.Property(je => je.IdJugadorEquipo).HasColumnName("id_jugador_equipo");
            e.Property(je => je.IdJugador)      .HasColumnName("id_jugador");
            e.Property(je => je.IdEquipo)       .HasColumnName("id_equipo");
            e.Property(je => je.FechaDesde)     .HasColumnName("fecha_desde");
            e.Property(je => je.FechaHasta)     .HasColumnName("fecha_hasta");
            e.Property(je => je.Posicion)       .HasColumnName("posicion");

            e.HasOne(je => je.Jugador)
                .WithMany(j => j.JugadorEquipos)
                .HasForeignKey(je => je.IdJugador);

            e.HasOne(je => je.Equipo)
                .WithMany(eq => eq.JugadorEquipos)
                .HasForeignKey(je => je.IdEquipo);
        });

        // ── Relaciones CampeonatoEquipo ──────────────────────────────────────
        modelBuilder.Entity<CampeonatoEquipo>(e =>
        {
            e.Property(ce => ce.IdCampeonato).HasColumnName("id_campeonato");
            e.Property(ce => ce.IdEquipo)    .HasColumnName("id_equipo");

            e.HasOne(ce => ce.Campeonato)
                .WithMany(c => c.Equipos)
                .HasForeignKey(ce => ce.IdCampeonato);

            e.HasOne(ce => ce.Equipo)
                .WithMany(eq => eq.CampeonatoEquipos)
                .HasForeignKey(ce => ce.IdEquipo);
        });

        // ── Relaciones Campeonato ────────────────────────────────────────────
        modelBuilder.Entity<Campeonato>(e =>
        {
            e.Property(c => c.IdCampeonato) .HasColumnName("id_campeonato");
            e.Property(c => c.Nombre)       .HasColumnName("nombre");
            e.Property(c => c.Anio)         .HasColumnName("anio");
            e.Property(c => c.FechaInicio)  .HasColumnName("fecha_inicio");
            e.Property(c => c.FechaFin)     .HasColumnName("fecha_fin");
            e.Property(c => c.Estado)       .HasColumnName("estado");
            e.Property(c => c.IdTipoPartido).HasColumnName("id_tipo_partido");
            e.Property(c => c.IdUsuarioCreador).HasColumnName("id_usuario_creador");

            e.HasOne(c => c.UsuarioCreador)
                .WithMany()
                .HasForeignKey(c => c.IdUsuarioCreador)
                .OnDelete(DeleteBehavior.SetNull);
            e.Property(c => c.IdModalidad)  .HasColumnName("id_modalidad");

            e.HasOne(c => c.TipoPartido)
                .WithMany(t => t.Campeonatos)
                .HasForeignKey(c => c.IdTipoPartido);

            e.HasOne(c => c.ModalidadDeportiva)
                .WithMany(m => m.Campeonatos)
                .HasForeignKey(c => c.IdModalidad);
        });

        // ── Relaciones Estadio ───────────────────────────────────────────────
        modelBuilder.Entity<Estadio>(e =>
        {
            e.Property(es => es.IdEstadio).HasColumnName("id_estadio");
            e.Property(es => es.Nombre)   .HasColumnName("nombre");
            e.Property(es => es.IdPais)   .HasColumnName("id_pais");
            e.Property(es => es.IdCanton) .HasColumnName("id_canton");
            e.Property(es => es.IdUsuarioCreador).HasColumnName("id_usuario_creador");

            e.HasOne(es => es.UsuarioCreador)
                .WithMany()
                .HasForeignKey(es => es.IdUsuarioCreador)
                .OnDelete(DeleteBehavior.SetNull);

            e.HasOne(es => es.Pais)
                .WithMany()
                .HasForeignKey(es => es.IdPais)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(es => es.Canton)
                .WithMany()
                .HasForeignKey(es => es.IdCanton)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // ── Relaciones Grupo ─────────────────────────────────────────────────
        modelBuilder.Entity<Grupo>(e =>
        {
            e.Property(g => g.IdGrupo)     .HasColumnName("id_grupo");
            e.Property(g => g.Nombre)      .HasColumnName("nombre");
            e.Property(g => g.IdCampeonato).HasColumnName("id_campeonato");

            e.HasOne(g => g.Campeonato)
                .WithMany(c => c.Grupos)
                .HasForeignKey(g => g.IdCampeonato);
        });

        // ── Relaciones Jornada ───────────────────────────────────────────────
        modelBuilder.Entity<Jornada>(e =>
        {
            e.Property(j => j.IdJornada)   .HasColumnName("id_jornada");
            e.Property(j => j.Numero)      .HasColumnName("numero");
            e.Property(j => j.IdCampeonato).HasColumnName("id_campeonato");
            e.Property(j => j.IdInstancia) .HasColumnName("id_instancia");
            e.Property(j => j.IdGrupo)     .HasColumnName("id_grupo");

            e.HasOne(j => j.Campeonato)
                .WithMany(c => c.Jornadas)
                .HasForeignKey(j => j.IdCampeonato);

            e.HasOne(j => j.Instancia)
                .WithMany(i => i.Jornadas)
                .HasForeignKey(j => j.IdInstancia);

            e.HasOne(j => j.Grupo)
                .WithMany(g => g.Jornadas)
                .HasForeignKey(j => j.IdGrupo);
        });

        // ── Relaciones Partido ───────────────────────────────────────────────
        modelBuilder.Entity<Partido>(e =>
        {
            e.Property(p => p.IdPartido)        .HasColumnName("id_partido");
            e.Property(p => p.IdJornada)        .HasColumnName("id_jornada");
            e.Property(p => p.IdEquipoLocal)    .HasColumnName("id_equipo_local");
            e.Property(p => p.IdEquipoVisitante).HasColumnName("id_equipo_visitante");
            e.Property(p => p.Fecha)            .HasColumnName("fecha");
            e.Property(p => p.IdEstadio)        .HasColumnName("id_estadio");
            e.Property(p => p.IdArbitro)        .HasColumnName("id_arbitro");
            e.Property(p => p.Jugado)           .HasColumnName("jugado");
            e.Property(p => p.Desierto)         .HasColumnName("desierto");
            e.Property(p => p.Observaciones)    .HasColumnName("observaciones");
            e.Property(p => p.PerdidaReglamento).HasColumnName("perdida_reglamento");
            e.Property(p => p.IdEquipoSancionado).HasColumnName("id_equipo_sancionado");
            e.Property(p => p.GolesLocal)       .HasColumnName("goles_local");
            e.Property(p => p.GolesVisitante)   .HasColumnName("goles_visitante");
            e.Property(p => p.CreatedAt)        .HasColumnName("created_at")
                                                .ValueGeneratedOnAdd();
            e.Property(p => p.UpdatedAt)        .HasColumnName("updated_at")
                                                .ValueGeneratedOnAddOrUpdate();

            e.HasOne(p => p.Jornada)
                .WithMany(j => j.Partidos)
                .HasForeignKey(p => p.IdJornada);

            e.HasOne(p => p.EquipoLocal)
                .WithMany()
                .HasForeignKey(p => p.IdEquipoLocal)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(p => p.EquipoVisitante)
                .WithMany()
                .HasForeignKey(p => p.IdEquipoVisitante)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(p => p.Estadio)
                .WithMany(es => es.Partidos)
                .HasForeignKey(p => p.IdEstadio);

            e.HasOne(p => p.Arbitro)
                .WithMany(a => a.Partidos)
                .HasForeignKey(p => p.IdArbitro);

            e.Property(p => p.IdGrupo).HasColumnName("id_grupo");
            e.HasOne(p => p.Grupo)
                .WithMany()
                .HasForeignKey(p => p.IdGrupo)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<CargoOficial>(e =>
        {
            e.Property(c => c.IdCargo).HasColumnName("id_cargo");
            e.Property(c => c.Codigo).HasColumnName("codigo");
            e.Property(c => c.Nombre).HasColumnName("nombre");
        });

        modelBuilder.Entity<ModalidadCargo>(e =>
        {
            e.Property(mc => mc.IdModalidad).HasColumnName("id_modalidad");
            e.Property(mc => mc.IdCargo).HasColumnName("id_cargo");
            e.Property(mc => mc.Obligatorio).HasColumnName("obligatorio");
            e.HasOne(mc => mc.Modalidad).WithMany(m => m.Cargos).HasForeignKey(mc => mc.IdModalidad);
            e.HasOne(mc => mc.Cargo).WithMany(c => c.Modalidades).HasForeignKey(mc => mc.IdCargo);
        });

        modelBuilder.Entity<PartidoOficial>(e =>
        {
            e.Property(po => po.IdPartido).HasColumnName("id_partido");
            e.Property(po => po.IdCargo).HasColumnName("id_cargo");
            e.Property(po => po.IdArbitro).HasColumnName("id_arbitro");
            e.HasOne(po => po.Partido).WithMany(p => p.Oficiales).HasForeignKey(po => po.IdPartido);
            e.HasOne(po => po.Cargo).WithMany(c => c.Partidos).HasForeignKey(po => po.IdCargo);
            e.HasOne(po => po.Arbitro).WithMany(a => a.Designaciones).HasForeignKey(po => po.IdArbitro);
        });

        // ── Relaciones EventoPartido ─────────────────────────────────────────
        modelBuilder.Entity<EventoPartido>(e =>
        {
            e.Property(ev => ev.IdEvento)  .HasColumnName("id_evento");
            e.Property(ev => ev.IdPartido) .HasColumnName("id_partido");
            e.Property(ev => ev.IdJugador) .HasColumnName("id_jugador");
            e.Property(ev => ev.TipoEvento).HasColumnName("tipo_evento");
            e.Property(ev => ev.Minuto)    .HasColumnName("minuto");
            e.Property(ev => ev.CreatedAt) .HasColumnName("created_at")
                                           .ValueGeneratedOnAdd();

            e.HasOne(ev => ev.Partido)
                .WithMany(p => p.Eventos)
                .HasForeignKey(ev => ev.IdPartido);

            e.HasOne(ev => ev.Jugador)
                .WithMany(j => j.Eventos)
                .HasForeignKey(ev => ev.IdJugador);
        });

        // ── Relaciones AlineacionJugador ─────────────────────────────────────
        modelBuilder.Entity<AlineacionJugador>(e =>
        {
            e.Property(a => a.IdAlineacion).HasColumnName("id_alineacion");
            e.Property(a => a.IdPartido)   .HasColumnName("id_partido");
            e.Property(a => a.IdEquipo)    .HasColumnName("id_equipo");
            e.Property(a => a.IdJugador)   .HasColumnName("id_jugador");
            e.Property(a => a.Titular)     .HasColumnName("titular");
            e.Property(a => a.CreatedAt)   .HasColumnName("created_at")
                                           .ValueGeneratedOnAdd();

            e.HasOne(a => a.Partido)
                .WithMany(p => p.Alineaciones)
                .HasForeignKey(a => a.IdPartido);

            e.HasOne(a => a.Equipo)
                .WithMany()
                .HasForeignKey(a => a.IdEquipo)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(a => a.Jugador)
                .WithMany()
                .HasForeignKey(a => a.IdJugador)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasIndex(a => new { a.IdPartido, a.IdJugador }).IsUnique();
        });

        // ── Relaciones CambioPartido ─────────────────────────────────────────
        modelBuilder.Entity<CambioPartido>(e =>
        {
            e.Property(c => c.IdCambio)      .HasColumnName("id_cambio");
            e.Property(c => c.IdPartido)     .HasColumnName("id_partido");
            e.Property(c => c.IdEquipo)      .HasColumnName("id_equipo");
            e.Property(c => c.IdJugadorSale) .HasColumnName("id_jugador_sale");
            e.Property(c => c.IdJugadorEntra).HasColumnName("id_jugador_entra");
            e.Property(c => c.Minuto)        .HasColumnName("minuto");
            e.Property(c => c.CreatedAt)     .HasColumnName("created_at")
                                             .ValueGeneratedOnAdd();

            e.HasOne(c => c.Partido)
                .WithMany(p => p.Cambios)
                .HasForeignKey(c => c.IdPartido);

            e.HasOne(c => c.Equipo)
                .WithMany()
                .HasForeignKey(c => c.IdEquipo)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(c => c.JugadorSale)
                .WithMany()
                .HasForeignKey(c => c.IdJugadorSale)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(c => c.JugadorEntra)
                .WithMany()
                .HasForeignKey(c => c.IdJugadorEntra)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ── Relaciones Grupo ─────────────────────────────────────────────────
        modelBuilder.Entity<Grupo>(e =>
        {
            e.Property(g => g.IdGrupo)     .HasColumnName("id_grupo");
            e.Property(g => g.Nombre)      .HasColumnName("nombre");
            e.Property(g => g.IdCampeonato).HasColumnName("id_campeonato");

            e.HasOne(g => g.Campeonato)
                .WithMany(c => c.Grupos)
                .HasForeignKey(g => g.IdCampeonato);
        });

        // ── Relaciones GrupoEquipo ───────────────────────────────────────────
        modelBuilder.Entity<GrupoEquipo>(e =>
        {
            e.Property(ge => ge.IdGrupo) .HasColumnName("id_grupo");
            e.Property(ge => ge.IdEquipo).HasColumnName("id_equipo");

            e.HasOne(ge => ge.Grupo)
                .WithMany(g => g.Equipos)
                .HasForeignKey(ge => ge.IdGrupo);

            e.HasOne(ge => ge.Equipo)
                .WithMany()
                .HasForeignKey(ge => ge.IdEquipo);
        });

        // ── Relaciones FaseCampeonato ────────────────────────────────────────
        modelBuilder.Entity<FaseCampeonato>(e =>
        {
            e.Property(f => f.IdFase)           .HasColumnName("id_fase");
            e.Property(f => f.IdCampeonato)     .HasColumnName("id_campeonato");
            e.Property(f => f.IdInstancia)      .HasColumnName("id_instancia");
            e.Property(f => f.Orden)            .HasColumnName("orden");
            e.Property(f => f.EquiposClasifican).HasColumnName("equipos_clasifican");
            e.Property(f => f.Formato)          .HasColumnName("formato")
                                                .HasConversion<string>();

            e.HasOne(f => f.Campeonato)
                .WithMany()
                .HasForeignKey(f => f.IdCampeonato);

            e.HasOne(f => f.Instancia)
                .WithMany()
                .HasForeignKey(f => f.IdInstancia);
        });

        // ── Relaciones PosicionGrupo ─────────────────────────────────────────
        modelBuilder.Entity<PosicionGrupo>(e =>
        {
            e.Property(p => p.IdPosicion).HasColumnName("id_posicion");
            e.Property(p => p.IdGrupo)   .HasColumnName("id_grupo");
            e.Property(p => p.IdEquipo)  .HasColumnName("id_equipo");
            e.Property(p => p.Pj)        .HasColumnName("pj");
            e.Property(p => p.Pg)        .HasColumnName("pg");
            e.Property(p => p.Pe)        .HasColumnName("pe");
            e.Property(p => p.Pp)        .HasColumnName("pp");
            e.Property(p => p.Gf)        .HasColumnName("gf");
            e.Property(p => p.Gc)        .HasColumnName("gc");
            e.Property(p => p.Pts)       .HasColumnName("pts");

            e.HasOne(p => p.Grupo)
                .WithMany(g => g.Posiciones)
                .HasForeignKey(p => p.IdGrupo);

            e.HasOne(p => p.Equipo)
                .WithMany()
                .HasForeignKey(p => p.IdEquipo);
        });

        modelBuilder.Entity<SancionManual>(e =>
        {
            e.Property(s => s.IdSancion)       .HasColumnName("id_sancion");
            e.Property(s => s.IdCampeonato)    .HasColumnName("id_campeonato");
            e.Property(s => s.IdJugador)       .HasColumnName("id_jugador");
            e.Property(s => s.Motivo)          .HasColumnName("motivo");
            e.Property(s => s.PartidosSancion) .HasColumnName("partidos_sancion");
            e.Property(s => s.FechaDecision)   .HasColumnName("fecha_decision");
            e.Property(s => s.CreatedAt)       .HasColumnName("created_at")
                                                .ValueGeneratedOnAdd();

            e.HasOne(s => s.Campeonato)
                .WithMany()
                .HasForeignKey(s => s.IdCampeonato)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(s => s.Jugador)
                .WithMany()
                .HasForeignKey(s => s.IdJugador)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ── Vocales (Fase 7) ─────────────────────────────────────────────────
        // El ENUM de MySQL guarda TITULAR/REEMPLAZO en mayúsculas.
        var tipoVocal = new Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<TipoVocal, string>(
            v => v.ToString().ToUpperInvariant(),
            v => Enum.Parse<TipoVocal>(v, true));

        modelBuilder.Entity<CampeonatoVocal>(e =>
        {
            e.HasKey(v => v.IdHabilitacion);
            e.Property(v => v.Tipo).HasConversion(tipoVocal);
            e.Property(v => v.CreatedAt).ValueGeneratedOnAdd();
            e.HasOne(v => v.Campeonato).WithMany().HasForeignKey(v => v.IdCampeonato).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(v => v.Usuario).WithMany().HasForeignKey(v => v.IdUsuario).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<InvitacionVocal>(e =>
        {
            e.HasKey(i => i.IdInvitacion);
            e.Property(i => i.Tipo).HasConversion(tipoVocal);
            e.Property(i => i.CreatedAt).ValueGeneratedOnAdd();
            e.HasIndex(i => i.TokenHash).IsUnique();
            e.HasOne(i => i.Campeonato).WithMany().HasForeignKey(i => i.IdCampeonato).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(i => i.Creador).WithMany().HasForeignKey(i => i.CreadaPor).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(i => i.UsuarioQueUso).WithMany().HasForeignKey(i => i.UsadaPor).OnDelete(DeleteBehavior.SetNull);
        });

        // ── Convención snake_case (SIEMPRE AL FINAL) ─────────────────────────
        foreach (var entity in modelBuilder.Model.GetEntityTypes())
            foreach (var property in entity.GetProperties())
                property.SetColumnName(ToSnakeCase(property.Name));
    }

    private static string ToSnakeCase(string name)
    {
        return string.Concat(name.Select((c, i) =>
            i > 0 && char.IsUpper(c)
                ? "_" + char.ToLower(c)
                : char.ToLower(c).ToString()));
    }
}
