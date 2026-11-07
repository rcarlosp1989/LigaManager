namespace LigaManager.Domain.Entities;

// Fase eliminatoria (llaves) de un campeonato: una por campeonato, después de la fase regular.
public enum ModoEliminatoria { MANUAL, AUTOMATICO }

// Qué pasa con las tarjetas y suspensiones al empezar la fase eliminatoria.
public enum ReglaTarjetasEliminatoria
{
    BORRAR_SALVO_EXPULSION_FINAL,   // se borran las amarillas; solo pasa la suspensión por roja en la última fecha
    MANTENER,                       // todo sigue: amarillas acumuladas y suspensiones pendientes
    BORRAR_TODO,                    // todos empiezan limpios
}

public enum TipoRonda { OCTAVOS, CUARTOS, SEMIFINAL, TERCER_PUESTO, FINAL }

// Criterio cuando la llave termina empatada (después del gol de visitante, si está activo).
public enum DesempateRonda { PENALES, PRORROGA_PENALES, MEJOR_UBICADO }

public class FaseEliminatoria
{
    public int                       IdFaseEliminatoria { get; set; }
    public int                       IdCampeonato       { get; set; }
    public ModoEliminatoria          Modo               { get; set; } = ModoEliminatoria.MANUAL;
    public int                       EquiposClasifican  { get; set; }
    public bool                      TercerPuesto       { get; set; }
    public ReglaTarjetasEliminatoria ReglaTarjetas      { get; set; } = ReglaTarjetasEliminatoria.BORRAR_SALVO_EXPULSION_FINAL;
    public DateTime                  CreatedAt          { get; set; }

    public Campeonato                     Campeonato { get; set; } = null!;
    public ICollection<RondaEliminatoria> Rondas     { get; set; } = [];
}

public class RondaEliminatoria
{
    public int            IdRonda            { get; set; }
    public int            IdFaseEliminatoria { get; set; }
    public TipoRonda      Tipo               { get; set; }
    public bool           IdaYVuelta         { get; set; }
    public DesempateRonda Desempate          { get; set; } = DesempateRonda.PENALES;
    public bool           GolVisitante       { get; set; }

    public FaseEliminatoria   Fase    { get; set; } = null!;
    public ICollection<Llave> Llaves  { get; set; } = [];
}

// Un cruce. El equipo A es local en la ida (o en el partido único).
public class Llave
{
    public int  IdLlave   { get; set; }
    public int  IdRonda   { get; set; }
    public int  Orden     { get; set; }
    public int  IdEquipoA { get; set; }
    public int  IdEquipoB { get; set; }
    public int? IdGanador { get; set; }   // definido a mano por el organizador (si no, se calcula)

    public RondaEliminatoria    Ronda    { get; set; } = null!;
    public Equipo               EquipoA  { get; set; } = null!;
    public Equipo               EquipoB  { get; set; } = null!;
    public ICollection<Partido> Partidos { get; set; } = [];
}
