import { useId } from 'react'

// Marca de LigaManager: un trofeo cuyo interior son tres barras que suben (la tabla de
// posiciones) y el nombre «LigaManager» en letra condensada inclinada.
// Las barras están recortadas (máscara), así el trofeo se ve bien sobre cualquier fondo.

export function SimboloTrofeo({ tamano = 32, color = '#2dd4bf', className = '' }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg width={tamano} height={Math.round(tamano * 1.1)} viewBox="0 0 120 132" aria-hidden="true" className={`shrink-0 ${className}`}>
      <mask id={`barras-${id}`}>
        <rect width="120" height="132" fill="#fff" />
        <rect x="42" y="50" width="10" height="18" rx="2" fill="#000" />
        <rect x="55" y="40" width="10" height="28" rx="2" fill="#000" />
        <rect x="68" y="28" width="10" height="40" rx="2" fill="#000" />
      </mask>
      <g fill={color} mask={`url(#barras-${id})`}>
        <path d="M30 24 H16 C16 46 24 56 36 58" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" />
        <path d="M90 24 H104 C104 46 96 56 84 58" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" />
        <path d="M28 14 H92 V50 C92 70 78 82 60 82 C42 82 28 70 28 50 Z" />
        <rect x="54" y="82" width="12" height="18" />
        <rect x="36" y="100" width="48" height="14" rx="4" />
      </g>
    </svg>
  )
}

const TAMANOS = {
  sm: { simbolo: 26, texto: 'text-2xl', frase: 'text-[10px]' },
  md: { simbolo: 34, texto: 'text-3xl', frase: 'text-[11px]' },
  lg: { simbolo: 64, texto: 'text-5xl sm:text-6xl', frase: 'text-xs' },
}

// vertical: símbolo arriba y nombre debajo (pantallas de inicio de sesión).
// frase: «Gestión de campeonatos» u otra, debajo del nombre.
export default function MarcaLiga({ tamano = 'md', vertical = false, frase = null, como: Etiqueta = 'p', className = '' }) {
  const t = TAMANOS[tamano] ?? TAMANOS.md
  return (
    <Etiqueta className={`m-0 flex ${vertical ? 'flex-col items-center gap-3 text-center' : 'items-center gap-2.5'} ${className}`}>
      <SimboloTrofeo tamano={t.simbolo} />
      <span className="flex flex-col">
        <span className={`font-marca leading-none text-white ${t.texto}`}>Liga<span className="text-brand-500">Manager</span></span>
        {frase && <span className={`mt-1.5 font-semibold uppercase tracking-[0.3em] text-gray-400 ${t.frase}`}>{frase}</span>}
      </span>
    </Etiqueta>
  )
}
