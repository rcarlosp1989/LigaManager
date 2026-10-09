namespace LigaManager.Infrastructure.Services;

// Hora de Ecuador (UTC-5, sin horario de verano). El servidor de Railway corre en UTC,
// así que «hoy» para el vocal se calcula aquí y no con DateTime.Today.
public static class HoraLocal
{
    private static readonly TimeSpan Desfase = TimeSpan.FromHours(-5);

    public static DateTime Ahora => DateTime.UtcNow + Desfase;
    public static DateOnly Hoy   => DateOnly.FromDateTime(Ahora);

    // Fin del día indicado, en hora UTC (para vencimientos guardados en UTC).
    public static DateTime FinDelDiaUtc(DateOnly dia) => dia.ToDateTime(new TimeOnly(23, 59, 59)) - Desfase;
}
