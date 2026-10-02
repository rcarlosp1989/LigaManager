namespace LigaManager.Application.Common;

// Reglas de sanciones por tarjetas, configurables desde appsettings.json (seccion "ReglasDisciplinarias").
// Pensado para moverse mas adelante a un modulo de Configuracion de Campeonato (por campeonato, no global);
// por eso EstadisticasService las recibe via IOptions<T> en vez de tenerlas hardcodeadas.
public class ReglasDisciplinariasOptions
{
    // Amarillas acumuladas (sin contar las que ya generaron sancion por doble amarilla) que generan 1 sancion.
    public int AmarillasParaSuspension { get; set; } = 5;

    // Partidos de suspension segun el motivo, independientes entre si.
    public int PartidosSuspensionPorRoja             { get; set; } = 2;
    public int PartidosSuspensionPorAcumulacion       { get; set; } = 1;
    public int PartidosSuspensionPorDobleAmarilla     { get; set; } = 1;
}
