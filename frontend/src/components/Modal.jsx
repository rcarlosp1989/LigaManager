// En pantallas angostas (menos de 640 px) la ventana ocupa toda la pantalla;
// en las demás se mantiene como ventana centrada. El encabezado queda fijo y
// solo se desplaza el contenido, para que el botón de cerrar siempre esté a mano.
export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div className={`relative bg-gray-900 shadow-2xl w-full ${maxWidth} flex flex-col
                      h-full max-h-full sm:h-auto sm:max-h-[90vh]
                      sm:border sm:border-gray-800 sm:rounded-xl`}>
        <div className="flex items-center justify-between gap-3 shrink-0 px-4 pt-3 pb-2 sm:px-6 sm:pt-5 sm:pb-3 border-b border-gray-800 sm:border-b-0">
          <h3 className="font-display text-xl text-white tracking-wide">{title}</h3>
          <button
            onClick={onClose}
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
  )
}
