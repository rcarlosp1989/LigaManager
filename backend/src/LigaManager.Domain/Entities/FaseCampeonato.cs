namespace LigaManager.Domain.Entities;

public enum FormatoFase { GRUPOS, ELIMINACION_DIRECTA, IDA_Y_VUELTA }

public class FaseCampeonato
{
    public int         IdFase            { get; set; }
    public int         IdCampeonato      { get; set; }
    public int         IdInstancia       { get; set; }
    public int         Orden             { get; set; }
    public FormatoFase Formato           { get; set; } = FormatoFase.GRUPOS;
    public int         EquiposClasifican { get; set; } = 2;

    public Campeonato        Campeonato { get; set; } = null!;
    public CatalogoInstancia Instancia  { get; set; } = null!;
}
