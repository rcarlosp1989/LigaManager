import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ChevronsRight } from 'lucide-react'

// Contenedor para tablas más anchas que la pantalla. Si la tabla no cabe:
//  - el borde por donde hay más columnas se difumina (a la derecha, y a la izquierda
//    cuando ya se deslizó);
//  - aparece «Desliza» arriba a la derecha hasta que se desliza por primera vez.
// Si la tabla cabe, no se ve nada distinto.
//
// «relative» en el área con desplazamiento: así el texto oculto de los encabezados
// (sr-only) queda dentro de ella y no ensancha la página en el celular.
const BORDE = 28 // px del difuminado

export default function TablaDesplazable({ children, className = '' }) {
  const ref = useRef(null)
  const [lados, setLados] = useState({ izq: false, der: false })
  const [deslizada, setDeslizada] = useState(false)

  const medir = () => {
    const el = ref.current
    if (!el) return
    const resto = el.scrollWidth - el.clientWidth - el.scrollLeft
    const izq = el.scrollLeft > 2
    const der = resto > 2
    setLados(l => (l.izq === izq && l.der === der ? l : { izq, der }))
  }

  // Se mide después de cada render: el contenido cambia cuando llegan los datos.
  useLayoutEffect(medir)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const alDeslizar = () => {
      medir()
      if (el.scrollLeft > 2) setDeslizada(true)
    }
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    el.addEventListener('scroll', alDeslizar, { passive: true })
    return () => { ro.disconnect(); el.removeEventListener('scroll', alDeslizar) }
  }, [])

  const mascara = lados.izq || lados.der
    ? `linear-gradient(to right, ${lados.izq ? `transparent, #000 ${BORDE}px` : '#000'}, ${lados.der ? `#000 calc(100% - ${BORDE}px), transparent` : '#000'})`
    : undefined

  return (
    <div className="relative">
      <div ref={ref} className={`relative overflow-x-auto ${className}`}
        style={mascara ? { maskImage: mascara, WebkitMaskImage: mascara } : undefined}>
        {children}
      </div>
      {lados.der && !deslizada && (
        <span aria-hidden="true"
          className="pointer-events-none absolute right-2 top-1.5 flex items-center gap-0.5 rounded-full border border-brand-500/40 bg-gray-950/90 px-2 py-0.5 text-[11px] font-medium text-brand-300 shadow">
          Desliza <ChevronsRight size={12} />
        </span>
      )}
    </div>
  )
}
