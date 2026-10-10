import { useId } from 'react'
import { ArrowLeftRight } from 'lucide-react'

// Íconos de los eventos del partido, dibujados para que se vean iguales en Android,
// iPhone y Windows (los emojis cambian según el sistema). Miden 1em: toman el tamaño
// del texto que los rodea. Son decorativos: el texto al lado dice qué evento es.

const PARCHES = ["12.00,-3.20 15.99,-0.30 14.47,4.40 9.53,4.40 8.01,-0.30", "26.46,7.30 24.93,12.00 19.99,12.00 18.47,7.30 22.46,4.40", "20.93,24.30 16.00,24.30 14.47,19.60 18.47,16.70 22.46,19.60", "3.07,24.30 1.54,19.60 5.53,16.70 9.53,19.60 8.00,24.30", "-2.46,7.30 1.54,4.40 5.53,7.30 4.01,12.00 -0.93,12.00"]

// size opcional, para usarlo donde se espera un ícono de lucide (pestañas, estados vacíos).
export function Balon({ className = '', size = '1em' }) {
  // useId trae caracteres que no sirven dentro de url(#…): se dejan solo letras y números.
  const id = `balon-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className={`inline-block shrink-0 align-[-0.125em] ${className}`}
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <defs><clipPath id={id}><circle cx="12" cy="12" r="10" /></clipPath></defs>
      <circle cx="12" cy="12" r="10" />
      <polygon points="12.00,7.80 15.99,10.70 14.47,15.40 9.53,15.40 8.01,10.70" fill="currentColor" strokeWidth="1" />
      <g clipPath={`url(#${id})`} fill="currentColor" strokeWidth="1">
        {PARCHES.map(pt => <polygon key={pt} points={pt} />)}
      </g>
      <path d="M12.00 7.80L12.00 4.60M15.99 10.70L19.04 9.71M14.47 15.40L16.35 17.99M9.53 15.40L7.65 17.99M8.01 10.70L4.96 9.71" strokeWidth="1.5" />
    </svg>
  )
}

// Arco con red: el gol en contra (como el emoji 🥅 que reemplaza).
export function Arco({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" className={`inline-block shrink-0 align-[-0.125em] ${className}`}
      fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 20V5h17v15" strokeWidth="2.2" />
      <path d="M1.5 20h21" strokeWidth="2.2" />
      <path d="M8 5v15M12 5v15M16 5v15M3.5 10h17M3.5 15h17" strokeWidth="1.1" opacity="0.7" />
    </svg>
  )
}

export function Tarjeta({ color = 'amarilla', className = '' }) {
  const fondo = color === 'roja' ? 'bg-red-600' : 'bg-yellow-300'
  return (
    <span aria-hidden="true"
      className={`inline-block h-[1em] w-[0.72em] shrink-0 rotate-[8deg] rounded-[0.14em] align-[-0.15em] ring-1 ring-black/60 ${fondo} ${className}`} />
  )
}

// tipo: GOL, GOL_EN_CONTRA, TARJETA_AMARILLA, TARJETA_ROJA o CAMBIO.
export default function IconoEvento({ tipo, className = '' }) {
  switch (tipo) {
    case 'GOL':              return <Balon className={className} />
    case 'GOL_EN_CONTRA':    return <Arco className={className} />
    case 'TARJETA_AMARILLA': return <Tarjeta color="amarilla" className={className} />
    case 'TARJETA_ROJA':     return <Tarjeta color="roja" className={className} />
    case 'CAMBIO':           return <ArrowLeftRight size="1em" aria-hidden="true" className={`inline-block shrink-0 align-[-0.125em] ${className}`} />
    default:                 return null
  }
}
