import { AlertTriangle, RotateCw } from 'lucide-react'

// Estado de error con «Reintentar». Un error del servidor nunca debe verse como una lista vacía.
// compacto: versión en línea para formularios y secciones pequeñas.
export default function EstadoError({
  mensaje = 'No se pudieron cargar los datos.',
  detalle = 'Revisa tu conexión e inténtalo de nuevo.',
  onReintentar,
  reintentando = false,
  compacto = false,
}) {
  const boton = onReintentar && (
    <button
      type="button"
      onClick={onReintentar}
      disabled={reintentando}
      className="btn-secundario shrink-0 gap-2"
    >
      <RotateCw size={16} className={reintentando ? 'animate-spin' : ''} aria-hidden="true" />
      {reintentando ? 'Reintentando...' : 'Reintentar'}
    </button>
  )

  if (compacto) {
    return (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-800 bg-red-900/20 px-3 py-2">
        <p className="text-red-300 text-sm flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0" aria-hidden="true" />
          {mensaje}
        </p>
        {boton}
      </div>
    )
  }

  return (
    <div role="alert" className="flex flex-col items-center justify-center py-16 text-center">
      <AlertTriangle size={40} className="text-red-400 mb-4" aria-hidden="true" />
      <h3 className="text-lg font-medium text-white mb-1">{mensaje}</h3>
      <p className="text-gray-400 text-sm max-w-sm mb-6">{detalle}</p>
      {boton}
    </div>
  )
}
