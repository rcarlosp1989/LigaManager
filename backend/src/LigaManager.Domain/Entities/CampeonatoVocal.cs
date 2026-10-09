namespace LigaManager.Domain.Entities;

// Vocal (juez de mesa) habilitado para registrar partidos de un campeonato.
// Titular: mientras dure el campeonato. Reemplazo: solo el día SoloFecha.
// En ambos casos solo puede registrar el día de cada partido.
public class CampeonatoVocal
{
    public int        IdHabilitacion { get; set; }
    public int        IdCampeonato   { get; set; }
    public int        IdUsuario      { get; set; }
    public TipoVocal  Tipo           { get; set; } = TipoVocal.Titular;
    public DateOnly?  SoloFecha      { get; set; }
    public bool       Activo         { get; set; } = true;
    public int?       CreadoPor      { get; set; }
    public DateTime   CreatedAt      { get; set; }

    public Campeonato Campeonato { get; set; } = null!;
    public Usuario    Usuario    { get; set; } = null!;
}

public enum TipoVocal
{
    Titular,
    Reemplazo
}
