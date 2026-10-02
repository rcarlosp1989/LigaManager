namespace LigaManager.Application.Common;

// Reglas de sanciones por tarjetas, configurables desde appsettings.json (seccion "ReglasDisciplinarias").
// Pensado para moverse mas adelante a un modulo de Configuracion de Campeonato (por campeonato, no global);
// por eso EstadisticasService las recibe via IOptions<T> en vez de tenerlas hardcodeadas.
public class ReglasDisciplinariasOptions
{
    // Amarillas acumuladas (sin contar las que ya generaron sancion por doble amarilla) que generan 1 sancion.
    public int AmarillasParaSuspension { get; set; } = 5;

    // Partidos de suspension segun el motivo. Hoy los 3 valen 1, pero quedan separados para poder
    // ajustarlos de forma independiente sin tocar codigo.
    public int PartidosSuspensionPorRoja             { get; set; } = 1;
    public int PartidosSuspensionPorAcumulacion       { get; set; } = 1;
    public int PartidosSuspensionPorDobleAmarilla     { get; set; } = 1;
}
