import LogoEquipo from './LogoEquipo'

// Un equipo de un partido en una línea: escudo, nombre completo (si no cabe, pasa a una segunda
// línea) y, si hay marcador, sus goles a la derecha, en la misma columna en todas las tarjetas.
// - atenuado: el que perdió se ve más tenue.
// - propio: el equipo del dirigente, resaltado.
// - grande: goles más grandes (marcadores en vivo).
// - children: lo que va debajo del equipo (goles y rojas en vivo).
export default function FilaEquipo({ nombre, logoUrl, goles = null, atenuado = false, propio = false, grande = false, children }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <LogoEquipo nombre={nombre} logoUrl={logoUrl} tamano={grande ? 28 : 24} />
        <span className={`min-w-0 flex-1 break-words text-sm leading-snug ${
          propio ? 'font-semibold text-brand-200' : atenuado ? 'text-gray-400' : 'font-medium text-white'}`}>
          {nombre}
        </span>
        {goles != null && (
          <span data-goles className={`w-9 shrink-0 text-right font-display leading-none tabular-nums ${grande ? 'text-3xl' : 'text-xl'} ${atenuado ? 'text-gray-400' : 'text-white'}`}>
            {goles}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}
