// Lógica de planilla compartida entre la planilla del partido y el modo en vivo.

// Jugadores con dorsal primero y en orden numérico; sin dorsal, al final.
export function ordenarPorDorsal(lista) {
  return [...lista].sort((a, b) => {
    if (a.dorsal == null && b.dorsal == null) return 0
    if (a.dorsal == null) return 1
    if (b.dorsal == null) return -1
    return a.dorsal - b.dorsal
  })
}

// En cancha: los titulares, más los que entraron, menos los que salieron.
// Solo quien está en cancha puede tener goles y tarjetas.
export function jugadoresEnCancha(alineacionEquipo, cambiosEquipo) {
  const enCancha = new Set(alineacionEquipo.filter(a => a.titular).map(a => a.idJugador))
  cambiosEquipo.forEach(c => enCancha.add(c.idJugadorEntra))
  cambiosEquipo.forEach(c => enCancha.delete(c.idJugadorSale))
  return alineacionEquipo.filter(a => enCancha.has(a.idJugador))
}

// Suplentes que todavía pueden entrar: los que no son titulares y no han entrado ya.
export function suplentesDisponibles(alineacionEquipo, cambiosEquipo) {
  const entrados = new Set(cambiosEquipo.map(c => c.idJugadorEntra))
  return alineacionEquipo.filter(a => !a.titular && !entrados.has(a.idJugador))
}

export const ETIQUETA_EVENTO = {
  GOL: 'Gol',
  GOL_EN_CONTRA: 'Gol en contra',
  TARJETA_AMARILLA: 'Tarjeta amarilla',
  TARJETA_ROJA: 'Tarjeta roja',
}

export const ICONO_EVENTO = {
  GOL: '⚽',
  GOL_EN_CONTRA: '🥅',
  TARJETA_AMARILLA: '🟨',
  TARJETA_ROJA: '🟥',
}

// Marcador a partir de los eventos: el gol suma a su equipo; el gol en contra, al rival.
// `equipoDe(idJugador)` devuelve 'local', 'visitante' o null.
export function marcadorDesdeEventos(eventos, equipoDe) {
  const marcador = { local: 0, visitante: 0 }
  for (const e of eventos) {
    const lado = equipoDe(e.idJugador)
    if (!lado) continue
    if (e.tipoEvento === 'GOL') marcador[lado] += 1
    if (e.tipoEvento === 'GOL_EN_CONTRA') marcador[lado === 'local' ? 'visitante' : 'local'] += 1
  }
  return marcador
}
