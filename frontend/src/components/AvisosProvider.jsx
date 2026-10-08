import { useCallback, useMemo, useRef, useState } from 'react'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'
import { AvisosContext } from '../feedback/contextos'

const DURACION = { exito: 3500, error: 7000 }

// Avisos breves en la parte inferior de la pantalla. Desaparecen solos y se pueden cerrar.
export default function AvisosProvider({ children }) {
  const [avisos, setAvisos] = useState([])
  const siguienteId = useRef(1)

  const quitar = useCallback((id) => setAvisos(lista => lista.filter(a => a.id !== id)), [])

  const agregar = useCallback((tipo, texto) => {
    const id = siguienteId.current++
    setAvisos(lista => [...lista.slice(-2), { id, tipo, texto }])
    setTimeout(() => quitar(id), DURACION[tipo])
  }, [quitar])

  const api = useMemo(() => ({
    exito: (texto) => agregar('exito', texto),
    error: (texto) => agregar('error', texto),
  }), [agregar])

  return (
    <AvisosContext.Provider value={api}>
      {children}
      <div
        className="fixed z-[70] inset-x-0 bottom-0 p-4 flex flex-col items-center gap-2 pointer-events-none
                   sm:inset-x-auto sm:right-4 sm:bottom-4 sm:p-0 sm:items-end"
        aria-live="polite"
      >
        {avisos.map(a => {
          const esError = a.tipo === 'error'
          const Icono = esError ? AlertCircle : CheckCircle2
          return (
            <div
              key={a.id}
              role={esError ? 'alert' : 'status'}
              className={`pointer-events-auto flex items-start gap-3 w-full max-w-sm rounded-lg border px-4 py-3 text-sm shadow-2xl
                ${esError ? 'bg-red-950 border-red-800 text-red-100' : 'bg-gray-900 border-brand-700 text-white'}`}
            >
              <Icono size={18} className={`shrink-0 mt-0.5 ${esError ? 'text-red-400' : 'text-brand-400'}`} aria-hidden="true" />
              <p className="flex-1 leading-snug">{a.texto}</p>
              <button
                onClick={() => quitar(a.id)}
                className="-my-1 -mr-2 p-1 text-gray-400 hover:text-white transition-colors"
                aria-label="Cerrar aviso"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          )
        })}
      </div>
    </AvisosContext.Provider>
  )
}
