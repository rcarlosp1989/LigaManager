import { useState } from 'react'
import { urlFoto } from '../utils/fotos'

// Foto del jugador en un círculo. Sin foto (o si no carga, por ejemplo sin señal), sus
// iniciales sobre gris. Es decorativa: el nombre siempre va escrito al lado.
//  - nombre: nombre completo («José García» o «García, José»).
//  - tamano: medida en píxeles (por defecto 32).

function iniciales(nombre = '') {
  const letra = (t = '') => t.trim().split(/\s+/).find(p => /\p{L}/u.test(p))?.[0] ?? ''
  if (nombre.includes(',')) {
    // «Apellido, Nombre»
    const [apellido, nom] = nombre.split(',')
    return (letra(nom) + letra(apellido)).toUpperCase() || '?'
  }
  // «Nombre(s) Apellido(s)»: con 4 palabras el primer apellido es la tercera; si no, la segunda.
  const p = nombre.trim().split(/\s+/).filter(x => /\p{L}/u.test(x))
  if (p.length === 0) return '?'
  return (p[0][0] + ((p.length >= 4 ? p[2] : p[1])?.[0] ?? '')).toUpperCase()
}

export default function FotoJugador({ nombre, fotoUrl, tamano = 32, className = '' }) {
  const [fallo, setFallo] = useState(null)
  const src = urlFoto(fotoUrl)
  const estilo = { width: tamano, height: tamano }

  if (src && fallo !== src) {
    return (
      <img src={src} alt="" aria-hidden="true" loading="lazy" decoding="async"
        width={tamano} height={tamano} style={estilo} onError={() => setFallo(src)}
        className={`inline-block shrink-0 rounded-full bg-gray-800 object-cover ring-1 ring-white/10 ${className}`} />
    )
  }
  return (
    <span aria-hidden="true" style={{ ...estilo, fontSize: Math.max(9, Math.round(tamano * 0.36)) }}
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full bg-gray-700 font-semibold leading-none text-gray-200 ring-1 ring-white/10 ${className}`}>
      {iniciales(nombre)}
    </span>
  )
}
