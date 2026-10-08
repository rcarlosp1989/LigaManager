import { useCallback, useId, useMemo, useRef } from 'react'
import { ModalContext, useDialogos } from '../feedback/contextos'
import { useAtraparFoco } from '../feedback/foco'

// Ventana emergente compartida.
// - En pantallas angostas (menos de 640 px) ocupa toda la pantalla.
// - Se cierra con Esc, con la ×, tocando fuera o con «Cancelar» (ver AccionesFormulario).
// - Si se escribió algo y se intenta cerrar, pregunta antes de descartar.
//   Por defecto detecta cualquier cambio en sus campos; con hayCambios el componente
//   que la usa decide (por ejemplo, la planilla, que guarda parte de lo que se hace al instante).
// - Cuando el formulario se guarda bien, quien la usa la cierra con isOpen = false y no se pregunta nada.
export default function Modal({ isOpen, ...props }) {
  if (!isOpen) return null
  return <VentanaModal {...props} />
}

function VentanaModal({ onClose, title, children, maxWidth = 'max-w-md', hayCambios }) {
  const { confirmar } = useDialogos()
  const ref = useRef(null)
  const editado = useRef(false)
  const tituloId = useId()

  useAtraparFoco(ref, { enfocarContenedor: true })

  const marcarEditado = () => { editado.current = true }

  const pedirCierre = useCallback(async () => {
    const sinGuardar = hayCambios ?? editado.current
    if (sinGuardar) {
      const descartar = await confirmar({
        titulo: '¿Descartar los cambios?',
        mensaje: 'Lo que escribiste en esta ventana se va a perder.',
        textoConfirmar: 'Descartar',
        textoCancelar: 'Seguir editando',
        peligro: true,
      })
      if (!descartar) return
    }
    onClose()
  }, [hayCambios, confirmar, onClose])

  const contexto = useMemo(() => ({ cerrar: pedirCierre }), [pedirCierre])

  return (
    <ModalContext.Provider value={contexto}>
      <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4">
        <div className="absolute inset-0 bg-black/60" onClick={pedirCierre} aria-hidden="true" />
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-labelledby={tituloId}
          tabIndex={-1}
          onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); pedirCierre() } }}
          onChangeCapture={marcarEditado}
          onInputCapture={marcarEditado}
          className={`relative bg-gray-900 shadow-2xl w-full ${maxWidth} flex flex-col outline-none
                      h-full max-h-full sm:h-auto sm:max-h-[90vh]
                      sm:border sm:border-gray-800 sm:rounded-xl`}
        >
          <div className="flex items-center justify-between gap-3 shrink-0 px-4 pt-3 pb-2 sm:px-6 sm:pt-5 sm:pb-3 border-b border-gray-800 sm:border-b-0">
            <h3 id={tituloId} className="font-display text-xl text-white tracking-wide">{title}</h3>
            <button
              onClick={pedirCierre}
              className="-mr-2 px-2 text-gray-500 hover:text-white transition-colors text-2xl leading-none"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-6 pt-4 sm:px-6 sm:pt-1">
            {children}
          </div>
        </div>
      </div>
    </ModalContext.Provider>
  )
}
