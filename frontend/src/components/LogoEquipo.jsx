import { useState } from 'react'
import { urlFoto } from '../utils/fotos'

// Escudo del equipo. Sin logo (o si no carga), un círculo con las iniciales del nombre y un
// color fijo por equipo, para que se distingan entre sí.
//  - tamano: medida en píxeles (por defecto 32).
// Es decorativo: el nombre del equipo siempre va escrito al lado.

const COLORES = [
  'bg-emerald-700', 'bg-sky-700', 'bg-violet-700', 'bg-rose-700',
  'bg-amber-700', 'bg-teal-700', 'bg-indigo-700', 'bg-fuchsia-700',
]

function iniciales(nombre = '') {
  const palabras = nombre.trim().split(/\s+/).filter(p => /[\p{L}\p{N}]/u.test(p))
  if (palabras.length === 0) return '?'
  if (palabras.length === 1) return palabras[0].slice(0, 2).toUpperCase()
  return (palabras[0][0] + palabras[1][0]).toUpperCase()
}

function colorDe(nombre = '') {
  let h = 0
  for (const c of nombre) h = (h * 31 + c.codePointAt(0)) >>> 0
  return COLORES[h % COLORES.length]
}

export default function LogoEquipo({ nombre, logoUrl, tamano = 32, className = '' }) {
  const [fallo, setFallo] = useState(null)
  const src = urlFoto(logoUrl)
  const estilo = { width: tamano, height: tamano }

  if (src && fallo !== src) {
    return (
      <img src={src} alt="" aria-hidden="true" loading="lazy" decoding="async"
        width={tamano} height={tamano} style={{ ...estilo, padding: Math.max(1, Math.round(tamano * 0.08)) }}
        onError={() => setFallo(src)}
        className={`inline-block shrink-0 rounded-full bg-white/95 object-contain ring-1 ring-white/10 ${className}`} />
    )
  }
  return (
    <span aria-hidden="true" style={{ ...estilo, fontSize: Math.max(9, Math.round(tamano * 0.38)) }}
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold leading-none text-white ring-1 ring-white/10 ${colorDe(nombre)} ${className}`}>
      {iniciales(nombre)}
    </span>
  )
}
