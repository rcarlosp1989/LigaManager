// Pequeños indicadores de color para las tablas. Usan la paleta de la app (turquesa de la
// marca, amarillo y rojo de las tarjetas, verde y rojo de los resultados) en tonos suaves,
// para que destaquen sin romper el fondo oscuro. Siempre van con el número o texto escrito:
// el color ayuda, pero no es lo único que da la información.

const MEDALLAS = {
  1: 'bg-amber-400/15 text-amber-300 ring-amber-400/40',
  2: 'bg-slate-300/10 text-slate-200 ring-slate-300/30',
  3: 'bg-orange-500/15 text-orange-300 ring-orange-400/40',
}

// Puesto en una tabla.
//  - clasificado: recuadro turquesa y ✓ (tabla de posiciones).
//  - medallas: oro, plata y bronce para los tres primeros (goleadores).
export function Puesto({ n, clasificado = false, medallas = false }) {
  const medalla = medallas ? MEDALLAS[n] : null
  const estilo = medalla
    ? `${medalla} ring-1 ring-inset font-semibold`
    : clasificado
      ? 'bg-brand-500/15 text-brand-300 ring-1 ring-inset ring-brand-500/40 font-semibold'
      : 'text-gray-500'
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1 text-xs tabular-nums ${estilo}`}>{n}</span>
      {clasificado && <span aria-hidden="true" className="text-[11px] text-brand-400">✓</span>}
      {clasificado && <span className="sr-only">(clasificado)</span>}
    </span>
  )
}

// Diferencia de goles: verde si es a favor, rojo si es en contra.
export function Diferencia({ valor }) {
  const tono = valor > 0 ? 'text-emerald-400' : valor < 0 ? 'text-rose-400' : 'text-gray-500'
  return <span className={`tabular-nums ${tono}`}>{valor > 0 ? `+${valor}` : valor}</span>
}

// Cantidad de tarjetas: recuadro amarillo o rojo si hay alguna; gris si es 0.
export function ConteoTarjetas({ valor, tipo }) {
  if (!valor) return <span className="tabular-nums text-gray-600">0</span>
  const tono = tipo === 'roja' ? 'bg-red-500/15 text-red-300 ring-red-500/30' : 'bg-yellow-400/15 text-yellow-300 ring-yellow-400/30'
  return <span className={`inline-flex min-w-7 justify-center rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums ring-1 ring-inset ${tono}`}>{valor}</span>
}

// Número con una barra que muestra su tamaño respecto al mayor de la tabla (goles).
export function ValorConBarra({ valor, maximo }) {
  const ancho = maximo > 0 ? Math.max(6, Math.round((valor / maximo) * 100)) : 0
  return (
    <span className="inline-flex items-center gap-2">
      <span className="w-6 text-right font-bold tabular-nums text-brand-300">{valor}</span>
      <span aria-hidden="true" className="h-1.5 w-14 overflow-hidden rounded-full bg-gray-800 sm:w-20">
        <span className="block h-full rounded-full bg-gradient-to-r from-brand-700 to-brand-400" style={{ width: `${ancho}%` }} />
      </span>
    </span>
  )
}

// Avance de una sanción (partidos cumplidos de los que debe cumplir).
export function Avance({ hecho, total }) {
  const ancho = total > 0 ? Math.min(100, Math.round((hecho / total) * 100)) : 0
  const completo = total > 0 && hecho >= total
  return (
    <span className="inline-flex items-center gap-2">
      <span className="tabular-nums text-gray-300">{hecho}/{total}</span>
      <span aria-hidden="true" className="h-1.5 w-12 overflow-hidden rounded-full bg-gray-800">
        <span className={`block h-full rounded-full ${completo ? 'bg-emerald-500' : 'bg-gradient-to-r from-rose-600 to-rose-400'}`} style={{ width: `${ancho}%` }} />
      </span>
    </span>
  )
}
