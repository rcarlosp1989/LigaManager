namespace LigaManager.Application.DTOs.Pagos;

// ── Pagos del campeonato ─────────────────────────────────────────────────────

// Valores del campeonato. InicioSegundaEtapa 'yyyy-MM-dd' o null (sin refuerzos).
public record ValoresDto(
    decimal Inscripcion,
    decimal Refuerzo,
    decimal Apelacion,
    decimal Arbitraje,
    decimal Amarilla,
    decimal Roja,
    string? InicioSegundaEtapa,
    bool    Configurados
);

public record GuardarValoresRequest(
    decimal Inscripcion,
    decimal Refuerzo,
    decimal Apelacion,
    decimal Arbitraje,
    decimal Amarilla,
    decimal Roja,
    string? InicioSegundaEtapa
);

// Resumen de un equipo. Multas: multas, apelaciones y otros cobros manuales.
public record ResumenEquipoPagosDto(
    int     IdEquipo,
    string  Nombre,
    string? LogoUrl,
    decimal Inscripcion,
    decimal Refuerzos,
    decimal Arbitraje,
    decimal Tarjetas,
    decimal Multas,
    decimal Total,
    decimal Pagado,
    decimal Saldo
);

public record ResumenPagosDto(
    ValoresDto                  Valores,
    List<ResumenEquipoPagosDto> Equipos,
    decimal                     Total,
    decimal                     Pagado,
    decimal                     Saldo
);

// Concepto: INSCRIPCION | REFUERZO | ARBITRAJE | AMARILLA | ROJA | MULTA | APELACION | OTRO.
public record CobroDto(
    int     IdPago,
    string  Fecha,
    string  Concepto,
    string  ConceptoNombre,
    string? Descripcion,
    decimal Monto,
    decimal Abonado,
    decimal Saldo,
    bool    Automatico
);

// Un registro de abono (si se repartió entre varios cobros, suma sus partes).
public record AbonoDto(
    string  Lote,
    string  Fecha,
    string  Metodo,
    string? Referencia,
    decimal Monto,
    List<string> Cobros
);

public record EstadoCuentaDto(
    int            IdEquipo,
    string         Equipo,
    string?        LogoUrl,
    string         Campeonato,
    List<CobroDto> Cobros,
    List<AbonoDto> Abonos,
    decimal        Total,
    decimal        Pagado,
    decimal        Saldo
);

// Concepto: MULTA | APELACION | OTRO. Monto null: el valor del campeonato (apelación).
public record CobroManualRequest(int IdEquipo, string Concepto, decimal? Monto, string Fecha, string? Descripcion);

// IdPago null: se reparte entre los cobros con saldo, del más antiguo al más nuevo.
public record AbonoRequest(decimal Monto, string Fecha, string Metodo, string? Referencia, int? IdPago);
