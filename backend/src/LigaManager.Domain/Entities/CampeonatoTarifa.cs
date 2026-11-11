namespace LigaManager.Domain.Entities;

// Valores que cobra cada campeonato. 0 = no se cobra.
public class CampeonatoTarifa
{
    public int       IdCampeonato       { get; set; }
    public decimal   Inscripcion        { get; set; }
    public decimal   Refuerzo           { get; set; }
    public decimal   Apelacion          { get; set; }
    public decimal   Arbitraje          { get; set; }   // a cada equipo, por partido jugado
    public decimal   Amarilla           { get; set; }
    public decimal   Roja               { get; set; }   // roja directa o por doble amarilla
    // Los jugadores inscritos desde esta fecha se cobran como refuerzo. Null = sin refuerzos.
    public DateOnly? InicioSegundaEtapa { get; set; }
    public DateTime  UpdatedAt          { get; set; }

    public Campeonato Campeonato { get; set; } = null!;
}
