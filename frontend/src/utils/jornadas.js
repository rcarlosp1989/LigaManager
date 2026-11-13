// Jornada «actual» para abrir: la primera con partidos por jugar; si no, la última.
// jornadas: [{ idJornada, jugados, total }].
export function jornadaActual(jornadas) {
  return (jornadas.find(j => j.total > 0 && j.jugados < j.total) ?? jornadas[jornadas.length - 1])?.idJornada
}
