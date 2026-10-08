import { useEffect, useId, useRef, useState } from 'react'
import { MoreVertical } from 'lucide-react'

// Menú «⋮» siempre visible, para acciones que antes solo aparecían con el cursor.
// acciones: [{ texto, onClick, peligro?, deshabilitado?, motivo? }]
// El menú se dibuja con posición fija para que no lo recorte una tabla con desplazamiento.
const ALTO_ESTIMADO = 180

export default function MenuAcciones({ etiqueta, acciones }) {
  const [posicion, setPosicion] = useState(null)
  const abierto = posicion !== null
  const contenedor = useRef(null)
  const boton = useRef(null)
  const menuId = useId()

  // Posición junto al botón; hacia arriba si no cabe abajo. null si el botón salió de la pantalla.
  const calcular = () => {
    const r = boton.current?.getBoundingClientRect()
    if (!r || r.bottom < 0 || r.top > window.innerHeight) return null
    const haciaArriba = r.bottom + ALTO_ESTIMADO > window.innerHeight && r.top > ALTO_ESTIMADO
    return {
      right: Math.max(8, window.innerWidth - r.right),
      ...(haciaArriba ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }),
    }
  }
  const abrir = () => setPosicion(calcular())

  const cerrar = (devolverFoco = true) => {
    setPosicion(null)
    if (devolverFoco) boton.current?.focus()
  }

  useEffect(() => {
    if (!abierto) return
    contenedor.current?.querySelector('[role="menuitem"]:not([aria-disabled="true"])')?.focus({ preventScroll: true })
    const fuera = (e) => { if (!contenedor.current?.contains(e.target)) setPosicion(null) }
    // Al desplazar la página o la tabla, el menú sigue al botón.
    const alMover = () => setPosicion(calcular())
    document.addEventListener('pointerdown', fuera)
    window.addEventListener('resize', alMover)
    window.addEventListener('scroll', alMover, true)
    return () => {
      document.removeEventListener('pointerdown', fuera)
      window.removeEventListener('resize', alMover)
      window.removeEventListener('scroll', alMover, true)
    }
  }, [abierto])

  const alTeclear = (e) => {
    if (!abierto) return
    const items = [...contenedor.current.querySelectorAll('[role="menuitem"]')]
    const i = items.indexOf(document.activeElement)
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cerrar() }
    else if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length]?.focus() }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus() }
    else if (e.key === 'Home') { e.preventDefault(); items[0]?.focus() }
    else if (e.key === 'End') { e.preventDefault(); items.at(-1)?.focus() }
    else if (e.key === 'Tab') setPosicion(null)
  }

  return (
    // Los clics dentro del menú no deben activar la fila o tarjeta que lo contiene.
    <div ref={contenedor} className="relative shrink-0" onKeyDown={alTeclear} onClick={e => e.stopPropagation()}>
      <button
        ref={boton}
        type="button"
        aria-label={etiqueta}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={abierto ? menuId : undefined}
        onClick={() => (abierto ? cerrar() : abrir())}
        className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-brand-400 ${
          abierto ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
        }`}
      >
        <MoreVertical size={18} aria-hidden="true" />
      </button>
      {abierto && (
        <div
          id={menuId}
          role="menu"
          aria-label={etiqueta}
          style={{ position: 'fixed', ...posicion }}
          className="z-40 min-w-48 max-w-72 rounded-lg border border-gray-700 bg-gray-900 py-1 shadow-2xl"
        >
          {acciones.map(a => (
            <button
              key={a.texto}
              type="button"
              role="menuitem"
              aria-disabled={a.deshabilitado || undefined}
              onClick={() => {
                if (a.deshabilitado) return
                cerrar()
                a.onClick()
              }}
              className={`block w-full px-4 py-2.5 text-left text-sm transition-colors focus:outline-none ${
                a.deshabilitado
                  ? 'cursor-not-allowed text-gray-600'
                  : a.peligro
                    ? 'text-red-400 hover:bg-red-950/40 focus:bg-red-950/40'
                    : 'text-gray-200 hover:bg-gray-800 focus:bg-gray-800'
              }`}
            >
              {a.texto}
              {a.deshabilitado && a.motivo && <span className="mt-0.5 block text-xs text-gray-500">{a.motivo}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
